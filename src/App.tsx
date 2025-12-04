import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

type Trainer = {
  id: string;
  name: string;
  email?: string;
  stundensatz?: number;
};

type Spieler = {
  id: string;
  name: string;
  kontaktEmail?: string;
  kontaktTelefon?: string;
  rechnungsAdresse?: string;
  notizen?: string;
};

type Tarif = {
  id: string;
  name: string;
  preisProStunde: number;
  abrechnung: "proTraining" | "proSpieler" | "monatlich";
  beschreibung?: string;
};

type TrainingStatus = "geplant" | "durchgefuehrt" | "abgesagt";

type AbrechnungTab = "spieler" | "trainer";
type VerwaltungTab = "spieler" | "trainer" | "tarife";

type Training = {
  id: string;
  trainerId?: string;
  datum: string;
  uhrzeitVon: string;
  uhrzeitBis: string;
  spielerIds: string[];
  tarifId?: string;
  status: TrainingStatus;
  notiz?: string;
  serieId?: string;
  customPreisProStunde?: number;
  customAbrechnung?: "proTraining" | "proSpieler";
  barBezahlt?: boolean;
};

type PaymentsMap = Record<string, boolean>; // key: `${monat}__${spielerId}`
type TrainerPaymentsMap = Record<string, boolean>; // key: trainingId

type AppState = {
  trainers: Trainer[];
  spieler: Spieler[];
  tarife: Tarif[];
  trainings: Training[];
  payments: PaymentsMap;
  trainerPayments: TrainerPaymentsMap;
};

type Tab = "kalender" | "training" | "verwaltung" | "abrechnung";
type Role = "admin" | "trainer";

type AuthUser = {
  id: string;
  email: string | null;
  role: Role;
  accountId: string | null;
  trainerId: string | null;
};

type ViewMode = "week" | "day";
type AbrechnungFilter = "alle" | "bezahlt" | "offen" | "bar";

const STORAGE_KEY = "tennis_planner_multi_trainer_v6";
const LEGACY_KEYS = [
  "tennis_planner_single_trainer",
  "tennis_planner_single_trainer_v5",
  "tennis_planner_single_trainer_v4",
  "tennis_planner_single_trainer_v3",
  "tennis_planner_single_trainer_v2",
  "tennis_planner_single_trainer_v1",
];

function uid() {
  return crypto.randomUUID();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function startOfWeekISO(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatShort(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  const w = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][(d.getDay() + 6) % 7];
  return `${w} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
}

function formatWeekRange(weekStartISO: string) {
  const start = new Date(weekStartISO + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const months = [
    "Jan.",
    "Feb.",
    "März",
    "Apr.",
    "Mai",
    "Juni",
    "Juli",
    "Aug.",
    "Sep.",
    "Okt.",
    "Nov.",
    "Dez.",
  ];

  const sDay = start.getDate();
  const eDay = end.getDate();
  const sMonth = start.getMonth();
  const eMonth = end.getMonth();
  const year = end.getFullYear();

  if (sMonth === eMonth) {
    return `${sDay} – ${eDay}. ${months[eMonth]} ${year}`;
  }
  return `${sDay}. ${months[sMonth]} – ${eDay}. ${months[eMonth]} ${year}`;
}

function formatMonthLabel(monthISO: string) {
  const parts = monthISO.split("-");
  const year = parts[0] ?? "";
  const month = parts[1] ?? "";
  return `${pad2(Number(month))}.${year}`;
}

function euro(n: number) {
  if (!Number.isFinite(n)) return "0,00 EUR";
  return `${n.toFixed(2).replace(".", ",")} EUR`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function statusLabel(s: TrainingStatus) {
  return s === "geplant"
    ? "offen"
    : s === "durchgefuehrt"
    ? "durchgeführt"
    : "abgesagt";
}

function statusDotColor(s: TrainingStatus) {
  if (s === "durchgefuehrt") return "#22c55e";
  if (s === "abgesagt") return "#ef4444";
  return "#3b82f6";
}

function paymentKey(monat: string, spielerId: string) {
  return `${monat}__${spielerId}`;
}

function ensureTrainerList(
  parsed: Partial<AppState> & {
    trainer?: Trainer | { name: string; email?: string };
  }
): Trainer[] {
  const inputList = Array.isArray(parsed?.trainers) ? parsed!.trainers : [];
  const normalized = inputList
    .filter(Boolean)
    .map((t, idx) => ({
      id: t.id || `trainer-${idx + 1}`,
      name: t.name?.trim() || `Trainer ${idx + 1}`,
      email: t.email?.trim() || undefined,
      stundensatz:
        typeof (t as any).stundensatz === "number"
          ? (t as any).stundensatz
          : Number((t as any).stundensatz) || 0,
    }));

  if (normalized.length > 0) return normalized;

  const single = (parsed as any)?.trainer as Trainer | undefined;
  return [
    {
      id: "trainer-1",
      name: single?.name?.trim() || "Trainer",
      email: single?.email?.trim() || undefined,
    },
  ];
}

function normalizeState(parsed: Partial<AppState> | null | undefined): AppState {
  const trainers = ensureTrainerList(parsed || {});
  const defaultTrainerId = trainers[0]?.id || "trainer-1";

  return {
    trainers,
    spieler: parsed?.spieler ?? [],
    tarife: parsed?.tarife ?? [],
    trainings: (parsed?.trainings ?? []).map((t, idx) => ({
      ...t,
      id: t.id || `training-${idx + 1}`,
      trainerId:
        t.trainerId && trainers.some((tr) => tr.id === t.trainerId)
          ? t.trainerId
          : defaultTrainerId,
    })),
    payments: parsed?.payments ?? {},
    trainerPayments: parsed?.trainerPayments ?? {},
  };
}

function readStateWithMeta(): { state: AppState; usedKey: string | null } {
  const tryParse = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Partial<AppState>;
    } catch {
      return null;
    }
  };

  const primary = tryParse(localStorage.getItem(STORAGE_KEY));
  if (primary) return { state: normalizeState(primary), usedKey: STORAGE_KEY };

  for (const k of LEGACY_KEYS) {
    const legacy = tryParse(localStorage.getItem(k));
    if (legacy)
      return {
        state: normalizeState(legacy),
        usedKey: k,
      };
  }

  return { state: normalizeState(null), usedKey: null };
}

function writeState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ::::: Auth UI ::::: */

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) setError(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrapper">
      <div className="card authCard">
        <h1>{mode === "login" ? "Login" : "Registrieren"}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <div className="muted" style={{ color: "#b91c1c", marginTop: 8 }}>
              {error}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy
                ? "Bitte warten..."
                : mode === "login"
                ? "Einloggen"
                : "Registrieren"}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 16 }}>
          {mode === "login" ? (
            <button
              className="btn btnGhost"
              onClick={() => setMode("register")}
            >
              Noch kein Konto? Registrieren
            </button>
          ) : (
            <button className="btn btnGhost" onClick={() => setMode("login")}>
              Bereits registriert? Einloggen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ::::: Haupt-App ::::: */

export default function App() {
  const initialRef = useRef<{
    state: AppState;
    usedKey: string | null;
  } | null>(null);

  if (initialRef.current === null) {
    initialRef.current = readStateWithMeta();
  }
  const initial = initialRef.current;

  const [tab, setTab] = useState<Tab>("kalender");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [dayIndex, setDayIndex] = useState<number>(0);
  const [kalenderTrainerFilter, setKalenderTrainerFilter] =
    useState<string>("alle");

  const [abrechnungTab, setAbrechnungTab] =
    useState<AbrechnungTab>("spieler");
  const [verwaltungTab, setVerwaltungTab] =
    useState<VerwaltungTab>("trainer");

  const [trainers, setTrainers] = useState<Trainer[]>(initial.state.trainers);
  const [spieler, setSpieler] = useState<Spieler[]>(initial.state.spieler);
  const [tarife, setTarife] = useState<Tarif[]>(initial.state.tarife);
  const [trainings, setTrainings] = useState<Training[]>(
    initial.state.trainings
  );
  const [payments, setPayments] = useState<PaymentsMap>(
    initial.state.payments ?? {}
  );
  const [trainerPayments, setTrainerPayments] =
    useState<TrainerPaymentsMap>(initial.state.trainerPayments ?? {});
  const [payConfirm, setPayConfirm] = useState<{
    monat: string;
    spielerId: string;
    spielerName: string;
    amount: number;
  } | null>(null);

  const [weekAnchor, setWeekAnchor] = useState<string>(todayISO());

  const [trainerName, setTrainerName] = useState(
    initial.state.trainers[0]?.name ?? ""
  );
  const [trainerEmail, setTrainerEmail] = useState(
    initial.state.trainers[0]?.email ?? ""
  );
  const [trainerStundensatz, setTrainerStundensatz] = useState<number | "">(
    initial.state.trainers[0]?.stundensatz ?? 0
  );
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);

  const [spielerName, setSpielerName] = useState("");
  const [spielerEmail, setSpielerEmail] = useState("");
  const [spielerTelefon, setSpielerTelefon] = useState("");
  const [spielerRechnung, setSpielerRechnung] = useState("");
  const [spielerNotizen, setSpielerNotizen] = useState("");
  const [editingSpielerId, setEditingSpielerId] = useState<string | null>(null);

  const [tarifName, setTarifName] = useState("");
  const [tarifPreisProStunde, setTarifPreisProStunde] = useState(60);
  const [tarifAbrechnung, setTarifAbrechnung] = useState<
    "proTraining" | "proSpieler" | "monatlich"
  >("proTraining");
  const [tarifBeschreibung, setTarifBeschreibung] = useState("");
  const [editingTarifId, setEditingTarifId] = useState<string | null>(null);

  const [tTrainerId, setTTrainerId] = useState(
    initial.state.trainers[0]?.id ?? ""
  );
  const [tDatum, setTDatum] = useState(todayISO());
  const [tVon, setTVon] = useState("16:00");
  const [tBis, setTBis] = useState("17:00");
  const [tTarifId, setTTarifId] = useState("");
  const [tStatus, setTStatus] = useState<TrainingStatus>("geplant");
  const [tNotiz, setTNotiz] = useState("");
  const [tCustomPreisProStunde, setTCustomPreisProStunde] = useState<
    number | ""
  >("");
  const [tCustomAbrechnung, setTCustomAbrechnung] =
    useState<"proTraining" | "proSpieler">("proTraining");

  const [spielerSuche, setSpielerSuche] = useState("");
  const [tSpielerIds, setTSpielerIds] = useState<string[]>([]);

  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState(() =>
    addDaysISO(todayISO(), 56)
  );
  const [applySerieScope, setApplySerieScope] =
    useState<"nurDieses" | "abHeute">("nurDieses");

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    null
  );

  const [abrechnungMonat, setAbrechnungMonat] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const [abrechnungFilter, setAbrechnungFilter] =
    useState<AbrechnungFilter>("alle");
  const [abrechnungTrainerFilter, setAbrechnungTrainerFilter] =
    useState<string>("alle");
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  const clickTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [doneFlashId, setDoneFlashId] = useState<string | null>(null);

  const hasMountedRef = useRef(false);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFinished, setProfileFinished] = useState(false);
  const [initialSynced, setInitialSynced] = useState(false);

  /* ::::: Local / Cloud Storage Migration ::::: */

  useEffect(() => {
    const usedKey = initial.usedKey;
    if (usedKey && usedKey !== STORAGE_KEY) {
      writeState(initial.state);
      for (const k of LEGACY_KEYS) {
        if (k !== STORAGE_KEY && localStorage.getItem(k))
          localStorage.removeItem(k);
      }
    }
    hasMountedRef.current = true;
  }, [initial.usedKey, initial.state]);

  useEffect(() => {
    if (!hasMountedRef.current) return;
    writeState({
      trainers,
      spieler,
      tarife,
      trainings,
      payments,
      trainerPayments,
    });
  }, [trainers, spieler, tarife, trainings, payments, trainerPayments]);

  /* ::::: Auth State von Supabase lesen ::::: */

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data.session;
      setAuthUser(
        session
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
              role: "admin",
              accountId: null,
              trainerId: null,
            }
          : null
      );
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: any) => {
        setAuthUser(
          session
            ? {
                id: session.user.id,
                email: session.user.email ?? null,
                role: "admin",
                accountId: null,
                trainerId: null,
              }
            : null
        );
        setInitialSynced(false);
        setProfileFinished(false);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ::::: Profil aus user_profiles laden (Rolle, Account, Trainer) ::::: */

  useEffect(() => {
    if (!authUser?.id) {
      setProfileFinished(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileFinished(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("role, account_id, trainer_id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Fehler beim Laden des Profils", error);
        }

        if (!cancelled && data) {
          setAuthUser((prev) =>
            prev
              ? {
                  ...prev,
                  role: (data.role as Role) || "admin",
                  accountId: data.account_id ?? prev.id,
                  trainerId: data.trainer_id ?? null,
                }
              : prev
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setProfileFinished(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  /* ::::: Initialen Zustand laden: lokal oder Supabase ::::: */

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (initialSynced) return;

    async function loadState() {
      if (!authUser) {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
        setInitialSynced(true);
        return;
      }

      if (!profileFinished) {
        return;
      }

      if (!authUser.accountId) {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
        setInitialSynced(true);
        return;
      }

      const { data, error } = await supabase
        .from("account_state")
        .select("data")
        .eq("account_id", authUser.accountId)
        .maybeSingle();

      if (error) {
        console.error("Fehler beim Laden des Zustands aus Supabase", error);
      }

      if (data && data.data) {
        const cloud = normalizeState(data.data as Partial<AppState>);
        setTrainers(cloud.trainers);
        setSpieler(cloud.spieler);
        setTarife(cloud.tarife);
        setTrainings(cloud.trainings);
        setPayments(cloud.payments ?? {});
        setTrainerPayments(cloud.trainerPayments ?? {});
      } else {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
      }

      setInitialSynced(true);
    }

    loadState();
  }, [authLoading, profileLoading, authUser, initialSynced, profileFinished]);

  /* ::::: Zustand nach Supabase schreiben ::::: */

  useEffect(() => {
    if (!authUser) return;
    if (!authUser.accountId) return;
    if (!initialSynced) return;

    const payload: AppState = {
      trainers,
      spieler,
      tarife,
      trainings,
      payments,
      trainerPayments,
    };

    supabase
      .from("account_state")
      .upsert({
        account_id: authUser.accountId,
        data: payload,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.error("Fehler beim Speichern des Zustands in Supabase", error);
        }
      });
  }, [
    authUser,
    initialSynced,
    trainers,
    spieler,
    tarife,
    trainings,
    payments,
    trainerPayments,
  ]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const trainerById = useMemo(
    () => new Map(trainers.map((t) => [t.id, t])),
    [trainers]
  );

  const spielerById = useMemo(
    () => new Map(spieler.map((s) => [s.id, s])),
    [spieler]
  );

  const tarifById = useMemo(
    () => new Map(tarife.map((t) => [t.id, t])),
    [tarife]
  );

  const isTrainer = authUser?.role === "trainer";
  const ownTrainerId =
    (authUser?.trainerId &&
      trainers.some((t) => t.id === authUser.trainerId) &&
      authUser.trainerId) ||
    trainers[0]?.id ||
    "";
  const defaultTrainerId = trainers[0]?.id ?? "";
  const selectedTrainerName =
    trainerById.get(tTrainerId)?.name ??
    trainerById.get(defaultTrainerId)?.name ??
    "Trainer";
  const trainerFilterLabel =
    abrechnungTrainerFilter === "alle"
      ? trainers.length === 1
        ? trainers[0]?.name ?? "Alle Trainer"
        : "Alle Trainer"
      : trainerById.get(abrechnungTrainerFilter)?.name ?? "Trainer";

  const visibleTabs: Tab[] = isTrainer
    ? ["kalender", "training", "abrechnung"]
    : ["kalender", "training", "verwaltung", "abrechnung"];

  const roleLabel = isTrainer ? "Trainer" : "Admin";

  const trainerOptionsForSelect = isTrainer
    ? trainers.filter(
        (t) => t.id === ownTrainerId || !ownTrainerId || trainers.length === 1
      )
    : trainers;

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && tTrainerId !== ownTrainerId) {
        setTTrainerId(ownTrainerId);
      }
      return;
    }
    if (!tTrainerId || !trainers.some((t) => t.id === tTrainerId)) {
      setTTrainerId(trainers[0].id);
    }
  }, [tTrainerId, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && abrechnungTrainerFilter !== ownTrainerId) {
        setAbrechnungTrainerFilter(ownTrainerId);
      }
      return;
    }
    if (
      abrechnungTrainerFilter !== "alle" &&
      !trainers.some((t) => t.id === abrechnungTrainerFilter)
    ) {
      setAbrechnungTrainerFilter("alle");
    }
  }, [abrechnungTrainerFilter, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && kalenderTrainerFilter !== ownTrainerId) {
        setKalenderTrainerFilter(ownTrainerId);
      }
      return;
    }
    if (
      kalenderTrainerFilter !== "alle" &&
      !trainers.some((t) => t.id === kalenderTrainerFilter)
    ) {
      setKalenderTrainerFilter("alle");
    }
  }, [kalenderTrainerFilter, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (isTrainer && tab === "verwaltung") {
      setTab("kalender");
    }
  }, [isTrainer, tab]);

  useEffect(() => {
    if (isTrainer) {
      setAbrechnungTab("trainer");
    } else {
      setAbrechnungTab("spieler");
    }
  }, [isTrainer]);

  const weekStart = useMemo(() => startOfWeekISO(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(() => {
    const startHour = 7;
    const endHour = 22;
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  }, []);

  const trainingsInWeek = useMemo(() => {
    const end = addDaysISO(weekStart, 7);
    return trainings
      .filter((t) => t.datum >= weekStart && t.datum < end)
      .filter((t) => {
        if (kalenderTrainerFilter === "alle") return true;
        const tid = t.trainerId || defaultTrainerId;
        return tid === kalenderTrainerFilter;
      })
      .sort((a, b) =>
        (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon)
      );
  }, [trainings, weekStart, kalenderTrainerFilter, defaultTrainerId]);

  const filteredSpielerForPick = useMemo(() => {
    const q = spielerSuche.trim().toLowerCase();
    if (!q) return spieler;
    return spieler.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.kontaktEmail ?? "").toLowerCase().includes(q)
    );
  }, [spieler, spielerSuche]);

  function addTrainer() {
    const name = trainerName.trim();
    if (!name) return;
    const rate =
      trainerStundensatz === "" ? 0 : Number(trainerStundensatz) || 0;

    const neu: Trainer = {
      id: uid(),
      name,
      email: trainerEmail.trim() || undefined,
      stundensatz: rate,
    };

    setTrainers((prev) => [...prev, neu]);
    setTrainerName("");
    setTrainerEmail("");
    setTrainerStundensatz(0);
    setEditingTrainerId(null);
    if (!tTrainerId) setTTrainerId(neu.id);
  }

  function startEditTrainer(t: Trainer) {
    setEditingTrainerId(t.id);
    setTrainerName(t.name);
    setTrainerEmail(t.email ?? "");
    setTrainerStundensatz(typeof t.stundensatz === "number" ? t.stundensatz : 0);
  }

  function saveTrainer() {
    if (!editingTrainerId) return;
    const name = trainerName.trim();
    if (!name) return;
    const rate =
      trainerStundensatz === "" ? 0 : Number(trainerStundensatz) || 0;

    setTrainers((prev) =>
      prev.map((t) =>
        t.id === editingTrainerId
          ? {
              ...t,
              name,
              email: trainerEmail.trim() || undefined,
              stundensatz: rate,
            }
          : t
      )
    );

    setEditingTrainerId(null);
    setTrainerName("");
    setTrainerEmail("");
    setTrainerStundensatz(0);
  }

  function deleteTrainer(id: string) {
    if (trainers.length <= 1) return;
    const remaining = trainers.filter((t) => t.id !== id);
    const fallbackId = remaining[0]?.id ?? id;
    setTrainers(remaining);
    setTrainings((prev) =>
      prev.map((t) =>
        t.trainerId === id ? { ...t, trainerId: fallbackId } : t
      )
    );
    if (tTrainerId === id) setTTrainerId(fallbackId);
    if (abrechnungTrainerFilter === id) {
      setAbrechnungTrainerFilter("alle");
    }
  }

  function addSpieler() {
    const name = spielerName.trim();
    if (!name) return;

    const neu: Spieler = {
      id: uid(),
      name,
      kontaktEmail: spielerEmail.trim() || undefined,
      kontaktTelefon: spielerTelefon.trim() || undefined,
      rechnungsAdresse: spielerRechnung.trim() || undefined,
      notizen: spielerNotizen.trim() || undefined,
    };

    setSpieler((prev) => [...prev, neu]);
    setEditingSpielerId(null);
    setSpielerName("");
    setSpielerEmail("");
    setSpielerTelefon("");
    setSpielerRechnung("");
    setSpielerNotizen("");
  }

  function startEditSpieler(s: Spieler) {
    setEditingSpielerId(s.id);
    setSpielerName(s.name);
    setSpielerEmail(s.kontaktEmail ?? "");
    setSpielerTelefon(s.kontaktTelefon ?? "");
    setSpielerRechnung(s.rechnungsAdresse ?? "");
    setSpielerNotizen(s.notizen ?? "");
  }

  function saveSpieler() {
    if (!editingSpielerId) return;
    const name = spielerName.trim();
    if (!name) return;

    setSpieler((prev) =>
      prev.map((s) =>
        s.id === editingSpielerId
          ? {
              ...s,
              name,
              kontaktEmail: spielerEmail.trim() || undefined,
              kontaktTelefon: spielerTelefon.trim() || undefined,
              rechnungsAdresse: spielerRechnung.trim() || undefined,
              notizen: spielerNotizen.trim() || undefined,
            }
          : s
      )
    );

    setEditingSpielerId(null);
    setSpielerName("");
    setSpielerEmail("");
    setSpielerTelefon("");
    setSpielerRechnung("");
    setSpielerNotizen("");
  }

  function addTarif() {
    const name = tarifName.trim();
    if (!name) return;

    const neu: Tarif = {
      id: uid(),
      name,
      preisProStunde: Number.isFinite(tarifPreisProStunde)
        ? tarifPreisProStunde
        : 0,
      abrechnung: tarifAbrechnung,
      beschreibung: tarifBeschreibung.trim() || undefined,
    };

    setTarife((prev) => [...prev, neu]);
    setTarifName("");
    setTarifPreisProStunde(60);
    setTarifAbrechnung("proTraining");
    setTarifBeschreibung("");
    setTTarifId((prev) => (prev ? prev : neu.id));
    setEditingTarifId(null);
  }

  function startEditTarif(t: Tarif) {
    setEditingTarifId(t.id);
    setTarifName(t.name);
    setTarifPreisProStunde(t.preisProStunde);
    setTarifAbrechnung(t.abrechnung);
    setTarifBeschreibung(t.beschreibung ?? "");
  }

  function saveTarif() {
    if (!editingTarifId) return;
    const name = tarifName.trim();
    if (!name) return;

    setTarife((prev) =>
      prev.map((t) =>
        t.id === editingTarifId
          ? {
              ...t,
              name,
              preisProStunde: Number.isFinite(tarifPreisProStunde)
                ? tarifPreisProStunde
                : 0,
              abrechnung: tarifAbrechnung,
              beschreibung: tarifBeschreibung.trim() || undefined,
            }
          : t
      )
    );

    setEditingTarifId(null);
    setTarifName("");
    setTarifPreisProStunde(60);
    setTarifAbrechnung("proTraining");
    setTarifBeschreibung("");
  }

  function toggleSpielerPick(id: string) {
    setTSpielerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function durationMin(von: string, bis: string) {
    const a = toMinutes(von);
    const b = toMinutes(bis);
    return Math.max(0, b - a);
  }

  function getPreisConfig(
    t: Training,
    tarifByIdMap: Map<string, Tarif>
  ): {
    preisProStunde: number;
    abrechnung: "proTraining" | "proSpieler" | "monatlich";
  } | null {
    if (t.tarifId) {
      const tarif = tarifByIdMap.get(t.tarifId);
      if (tarif) {
        return {
          preisProStunde: tarif.preisProStunde,
          abrechnung: tarif.abrechnung,
        };
      }
    }

    if (
      typeof t.customPreisProStunde === "number" &&
      t.customPreisProStunde > 0
    ) {
      return {
        preisProStunde: t.customPreisProStunde,
        abrechnung: t.customAbrechnung ?? "proTraining",
      };
    }

    return null;
  }

  function trainingPreisGesamt(t: Training) {
    const cfg = getPreisConfig(t, tarifById);
    if (!cfg) return 0;

    if (cfg.abrechnung === "monatlich") return 0;

    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = cfg.preisProStunde * (mins / 60);

    if (cfg.abrechnung === "proSpieler") {
      return basis * t.spielerIds.length;
    }
    return basis;
  }

  function priceFuerSpieler(t: Training) {
    const cfg = getPreisConfig(t, tarifById);
    if (!cfg) return 0;

    if (cfg.abrechnung === "monatlich") return 0;

    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = cfg.preisProStunde * (mins / 60);

    if (cfg.abrechnung === "proSpieler") return basis;
    const n = Math.max(1, t.spielerIds.length);
    return basis / n;
  }

  function trainerHonorarFuerTraining(t: Training) {
    const tid = t.trainerId || defaultTrainerId;
    const trainer = trainerById.get(tid);
    const rate = trainer?.stundensatz ?? 0;
    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    return round2(rate * (mins / 60));
  }

  function fillTrainingFromSelected(t: Training) {
    if (isTrainer) return;
    setTTrainerId(t.trainerId ?? defaultTrainerId);
    setTDatum(t.datum);
    setTVon(t.uhrzeitVon);
    setTBis(t.uhrzeitBis);
    setTTarifId(t.tarifId ?? "");
    setTStatus(t.status);
    setTNotiz(t.notiz ?? "");
    setTSpielerIds(t.spielerIds);
    setSelectedTrainingId(t.id);
    setRepeatWeekly(false);
    setApplySerieScope("nurDieses");
    setTCustomPreisProStunde(
      typeof t.customPreisProStunde === "number" ? t.customPreisProStunde : ""
    );
    setTCustomAbrechnung(t.customAbrechnung ?? "proTraining");
    setTab("training");
  }

  function resetTrainingForm() {
    setSelectedTrainingId(null);
    setTTrainerId(defaultTrainerId);
    setTDatum(todayISO());
    setTVon("16:00");
    setTBis("17:00");
    setTStatus("geplant");
    setTNotiz("");
    setSpielerSuche("");
    setTSpielerIds([]);
    setRepeatWeekly(false);
    setRepeatUntil(addDaysISO(todayISO(), 56));
    setApplySerieScope("nurDieses");
    setTTarifId("");
    setTCustomPreisProStunde("");
    setTCustomAbrechnung("proTraining");
  }

  function deleteTraining(id: string) {
    if (isTrainer) return;
    const existing = trainings.find((t) => t.id === id);

    if (existing && existing.serieId && applySerieScope === "abHeute") {
      const sid = existing.serieId;
      const cutoff = existing.datum;
      setTrainings((prev) =>
        prev.filter((t) => !(t.serieId === sid && t.datum >= cutoff))
      );
    } else {
      setTrainings((prev) => prev.filter((t) => t.id !== id));
    }

    if (selectedTrainingId === id) {
      resetTrainingForm();
    }
  }

  function triggerDonePulse(trainingId: string) {
    setDoneFlashId(trainingId);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setDoneFlashId((prev) => (prev === trainingId ? null : prev));
    }, 650);

    const el = document.querySelector(
      `[data-training-id="${trainingId}"]`
    ) as HTMLElement | null;
    if (el) {
      el.animate(
        [
          { transform: "scale(1)", filter: "brightness(1)" },
          { transform: "scale(1.06)", filter: "brightness(1.15)" },
          { transform: "scale(1)", filter: "brightness(1)" },
        ],
        { duration: 650, easing: "ease-out" }
      );
    }
  }

  function markTrainingDone(trainingId: string) {
    let changed = false;

    setTrainings((prev) =>
      prev.map((t) => {
        if (t.id !== trainingId) return t;
        if (t.status !== "geplant") return t;
        changed = true;
        return { ...t, status: "durchgefuehrt" };
      })
    );

    if (changed) triggerDonePulse(trainingId);
  }

  function goToToday() {
    const t = todayISO();
    setWeekAnchor(t);

    if (viewMode === "day") {
      const d = new Date(t + "T12:00:00");
      const idx = (d.getDay() + 6) % 7;
      setDayIndex(idx);
    }
  }

  function handleCalendarEventClick(t: Training) {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      fillTrainingFromSelected(t);
      clickTimerRef.current = null;
    }, 220);
  }

  function handleCalendarEventDoubleClick(t: Training) {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
    markTrainingDone(t.id);
  }

  function saveTraining() {
    if (isTrainer) return;
    const hasTarif = !!tTarifId;
    const customPreis =
      !tTarifId &&
      typeof tCustomPreisProStunde === "number" &&
      tCustomPreisProStunde > 0
        ? tCustomPreisProStunde
        : undefined;

    if (!tDatum || !tVon || !tBis || tSpielerIds.length === 0) return;
    const mins = durationMin(tVon, tBis);
    if (mins <= 0) return;
    if (!hasTarif && !customPreis) return;
    const trainerIdForSave = tTrainerId || defaultTrainerId;
    if (!trainerIdForSave) return;

    const existing = selectedTrainingId
      ? trainings.find((x) => x.id === selectedTrainingId)
      : undefined;

    if (selectedTrainingId && existing) {
      const payload: Training = {
        ...existing,
        trainerId: trainerIdForSave,
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: hasTarif ? tTarifId : undefined,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
        customPreisProStunde: customPreis,
        customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
      };

      if (existing.serieId && applySerieScope === "abHeute") {
        const sid = existing.serieId;
        setTrainings((prev) =>
          prev.map((x) => {
            if (!x.serieId || x.serieId !== sid) return x;
            if (x.datum < existing.datum) return x;
            return {
              ...x,
              uhrzeitVon: payload.uhrzeitVon,
              uhrzeitBis: payload.uhrzeitBis,
              trainerId: payload.trainerId,
              tarifId: payload.tarifId,
              spielerIds: payload.spielerIds,
              status: payload.status,
              notiz: payload.notiz,
              customPreisProStunde: payload.customPreisProStunde,
              customAbrechnung: payload.customAbrechnung,
            };
          })
        );
      } else {
        setTrainings((prev) =>
          prev.map((x) => (x.id === selectedTrainingId ? payload : x))
        );
      }

      resetTrainingForm();
      setTab("kalender");
      return;
    }

    if (repeatWeekly) {
      const until = repeatUntil;
      if (!until || until < tDatum) return;

      const serieId = uid();
      const created: Training[] = [];
      let d = tDatum;

      while (d <= until) {
        created.push({
          id: uid(),
          datum: d,
          uhrzeitVon: tVon,
          uhrzeitBis: tBis,
          trainerId: trainerIdForSave,
          tarifId: hasTarif ? tTarifId : undefined,
          spielerIds: tSpielerIds,
          status: tStatus,
          notiz: tNotiz.trim() || undefined,
          serieId,
          customPreisProStunde: customPreis,
          customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
        });
        d = addDaysISO(d, 7);
      }

      setTrainings((prev) => [...prev, ...created]);
      resetTrainingForm();
      setTab("kalender");
      return;
    }

    setTrainings((prev) => [
      ...prev,
      {
        id: uid(),
        trainerId: trainerIdForSave,
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: hasTarif ? tTarifId : undefined,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
        customPreisProStunde: customPreis,
        customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
      },
    ]);

    resetTrainingForm();
    setTab("kalender");
  }

  const preisVorschau = useMemo(() => {
    if (tSpielerIds.length === 0) return 0;

    const hasTarif = !!tTarifId;
    const customPreis =
      !tTarifId &&
      typeof tCustomPreisProStunde === "number" &&
      tCustomPreisProStunde > 0
        ? tCustomPreisProStunde
        : undefined;

    if (!hasTarif && !customPreis) return 0;

    const fake: Training = {
      id: "x",
      trainerId: tTrainerId || defaultTrainerId,
      datum: tDatum,
      uhrzeitVon: tVon,
      uhrzeitBis: tBis,
      tarifId: hasTarif ? tTarifId : undefined,
      spielerIds: tSpielerIds,
      status: tStatus,
      notiz: tNotiz || undefined,
      customPreisProStunde: customPreis,
      customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
    };

    return trainingPreisGesamt(fake);
  }, [
    tDatum,
    tVon,
    tBis,
    tTarifId,
    tSpielerIds,
    tStatus,
    tNotiz,
    tCustomPreisProStunde,
    tCustomAbrechnung,
    tarifById,
    tTrainerId,
    defaultTrainerId,
  ]);

  const trainingsInMonth = useMemo(
    () =>
      trainings
        .filter((t) => t.datum.startsWith(abrechnungMonat))
        .filter((t) => t.status === "durchgefuehrt")
        .filter((t) => {
          if (abrechnungTrainerFilter === "alle") return true;
          const tid = t.trainerId || defaultTrainerId;
          return tid === abrechnungTrainerFilter;
        })
        .sort((a, b) =>
          (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon)
        ),
    [trainings, abrechnungMonat, abrechnungTrainerFilter, defaultTrainerId]
  );

  const trainingsForAbrechnung = useMemo(
    () =>
      abrechnungFilter === "bar"
        ? trainingsInMonth.filter((t) => t.barBezahlt)
        : trainingsInMonth,
    [trainingsInMonth, abrechnungFilter]
  );

   const abrechnung = useMemo(() => {
    const perSpieler = new Map<
      string,
      { name: string; sum: number; counts: Map<number, number> }
    >();
    const monthlySeen = new Map<string, Set<string>>();

    const addShare = (pid: string, name: string, amount: number) => {
      const share = round2(amount);
      let entry = perSpieler.get(pid);
      if (!entry) {
        entry = { name, sum: 0, counts: new Map<number, number>() };
        perSpieler.set(pid, entry);
      }
      entry.sum = round2(entry.sum + share);
      entry.counts.set(share, (entry.counts.get(share) ?? 0) + 1);
    };

    // Rechnung: nur nicht-bar bezahlte Stunden
    trainingsInMonth.forEach((t) => {
      if (t.barBezahlt) return;

      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;

      if (cfg.abrechnung === "monatlich") {
        const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
        t.spielerIds.forEach((pid) => {
          const name = spielerById.get(pid)?.name ?? "Unbekannt";
          const seen = monthlySeen.get(pid) ?? new Set<string>();
          if (seen.has(tarifKey)) return;
          seen.add(tarifKey);
          monthlySeen.set(pid, seen);
          addShare(pid, name, cfg.preisProStunde);
        });
        return;
      }

      const share = priceFuerSpieler(t);
      t.spielerIds.forEach((pid) => {
        const name = spielerById.get(pid)?.name ?? "Unbekannt";
        addShare(pid, name, share);
      });
    });

    const spielerRows = Array.from(perSpieler.entries())
      .map(([id, v]) => {
        const breakdown = Array.from(v.counts.entries())
          .map(([amount, count]) => ({
            amount,
            count,
            subtotal: round2(amount * count),
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          id,
          name: v.name,
          sum: round2(v.sum),
          breakdown,
        };
      })
      .sort((a, b) => b.sum - a.sum);

    const total = round2(spielerRows.reduce((sum, r) => sum + r.sum, 0));

    // Bar-Umsatz separat berechnen
    let barTotal = 0;
    trainingsInMonth.forEach((t) => {
      if (!t.barBezahlt) return;
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;
      if (cfg.abrechnung === "monatlich") return;

      const amount = round2(trainingPreisGesamt(t));
      barTotal = round2(barTotal + amount);
    });

    const totalMitBar = round2(total + barTotal);

    return { total, spielerRows, barTotal, totalMitBar };
  }, [trainingsInMonth, spielerById, priceFuerSpieler, tarifById]);

  const abrechnungTrainer = useMemo(() => {
    type TrainerAbrechnungSummary = {
      name: string;
      sum: number;
      trainings: number;
      honorar: number;
      honorarBezahlt: number;
      honorarOffen: number;
      barDifferenz: number;
    };

    const perTrainer = new Map<string, TrainerAbrechnungSummary>();
    const monthlySeen = new Map<string, Set<string>>();

    trainingsInMonth.forEach((t) => {
      const tid = t.trainerId || defaultTrainerId;
      const name = trainerById.get(tid)?.name ?? "Trainer";
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;

      const honorar = trainerHonorarFuerTraining(t);
      let entry =
        perTrainer.get(tid) ?? {
          name,
          sum: 0,
          trainings: 0,
          honorar: 0,
          honorarBezahlt: 0,
          honorarOffen: 0,
          barDifferenz: 0,
        };

      let amount = 0;

      if (cfg.abrechnung === "monatlich") {
        const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
        const seen = monthlySeen.get(tid) ?? new Set<string>();
        t.spielerIds.forEach((pid) => {
          const key = `${tarifKey}__${pid}`;
          if (!seen.has(key)) {
            seen.add(key);
            entry.sum = round2(entry.sum + cfg.preisProStunde);
          }
        });
        monthlySeen.set(tid, seen);
      } else {
        amount = round2(trainingPreisGesamt(t));
        entry.sum = round2(entry.sum + amount);
      }

      if (t.barBezahlt && cfg.abrechnung !== "monatlich") {
        const diff = round2(amount - honorar);
        entry.barDifferenz = round2(entry.barDifferenz + diff);
      }

      entry.trainings += 1;
      entry.honorar = round2(entry.honorar + honorar);

      const paid = !!trainerPayments[t.id];
      if (paid) {
        entry.honorarBezahlt = round2(entry.honorarBezahlt + honorar);
      } else {
        entry.honorarOffen = round2(entry.honorarOffen + honorar);
      }

      perTrainer.set(tid, entry);
    });

    const rows = Array.from(perTrainer.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.sum - a.sum);

    const total = round2(rows.reduce((acc, r) => acc + r.sum, 0));
    const totalHonorar = round2(rows.reduce((acc, r) => acc + r.honorar, 0));
    const totalHonorarBezahlt = round2(
      rows.reduce((acc, r) => acc + r.honorarBezahlt, 0)
    );
    const totalHonorarOffen = round2(
      rows.reduce((acc, r) => acc + r.honorarOffen, 0)
    );
    const totalRueckzahlung = round2(
      rows.reduce((acc, r) => acc + r.barDifferenz, 0)
    );

    return {
      total,
      rows,
      totalHonorar,
      totalHonorarBezahlt,
      totalHonorarOffen,
      totalRueckzahlung,
    };
  }, [
    defaultTrainerId,
    trainerById,
    trainingsInMonth,
    tarifById,
    trainerHonorarFuerTraining,
    trainerPayments,
    trainingPreisGesamt,
  ]);

  function togglePaidForPlayer(monat: string, spielerId: string) {
    if (isTrainer) return;
    const key = paymentKey(monat, spielerId);
    setPayments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function openPayConfirm(
    monat: string,
    spielerId: string,
    spielerName: string,
    amount: number
  ) {
    setPayConfirm({ monat, spielerId, spielerName, amount });
  }

  function closePayConfirm() {
    setPayConfirm(null);
  }

  function confirmPay() {
    if (!payConfirm) return;
    togglePaidForPlayer(payConfirm.monat, payConfirm.spielerId);
    setPayConfirm(null);
  }

  function toggleTrainerPaid(trainingId: string) {
    if (isTrainer) return;
    setTrainerPayments((prev) => ({
      ...prev,
      [trainingId]: !prev[trainingId],
    }));
  }

  function toggleBarBezahlt(trainingId: string) {
    if (isTrainer) return;
    setTrainings((prev) =>
      prev.map((t) =>
        t.id === trainingId ? { ...t, barBezahlt: !t.barBezahlt } : t
      )
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setInitialSynced(false);
    setProfileFinished(false);
  }

  if (authLoading) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: 60 }}>
          Lädt ...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen />;
  }

  const filteredSpielerRowsForMonth = abrechnung.spielerRows.filter((r) => {
    const key = paymentKey(abrechnungMonat, r.id);
    const paid = payments[key] ?? false;

    if (abrechnungFilter === "alle") return true;
    if (abrechnungFilter === "bezahlt") return paid;
    if (abrechnungFilter === "offen") return !paid;
    if (abrechnungFilter === "bar") return true;
    return true;
  });

  const sumBezahlt = round2(
    abrechnung.spielerRows.reduce((acc, r) => {
      const key = paymentKey(abrechnungMonat, r.id);
      const paid = payments[key] ?? false;
      return acc + (paid ? r.sum : 0);
    }, 0)
  );

  const sumOffen = round2(
    abrechnung.spielerRows.reduce((acc, r) => {
      const key = paymentKey(abrechnungMonat, r.id);
      const paid = payments[key] ?? false;
      return acc + (!paid ? r.sum : 0);
    }, 0)
  );

  const trainerHonorarTotal = abrechnungTrainer.totalHonorar;
  const trainerHonorarBezahltTotal = abrechnungTrainer.totalHonorarBezahlt;
  const trainerHonorarOffenTotal = abrechnungTrainer.totalHonorarOffen;
  const trainerRueckzahlungTotal = abrechnungTrainer.totalRueckzahlung;

  return (
    <>
      <div className="appShell">
        <header className="mobileTopBar">
          <button
            className="iconButton"
            onClick={() => setIsSideNavOpen((v) => !v)}
            aria-label="Navigation öffnen"
          >
            <span className="iconBar" />
            <span className="iconBar" />
            <span className="iconBar" />
          </button>

          <div className="mobileTopTitle">
            <div className="mobileTopMain">Tennistrainer Planung</div>
            <div className="mobileTopSub">
              {roleLabel} · {trainerFilterLabel}
            </div>
          </div>
        </header>

        <aside className={`sideNav ${isSideNavOpen ? "sideNavOpen" : ""}`}>
          <div className="sideNavHeader">
            <div className="sideTitle">Tennistrainer Planung</div>
            <div className="sideSubtitle">
              Mehrere Trainer, wiederkehrende Termine, Tarife pro Stunde.
            </div>
          </div>

          <span className="pill sideRolePill">
            Rolle: <strong>{roleLabel}</strong>
          </span>

          <nav className="sideTabs">
            {visibleTabs.map((t) => (
              <button
                key={t}
                className={`tabBtn sideTabBtn ${
                  tab === t ? "tabBtnActive" : ""
                }`}
                onClick={() => {
                  setTab(t);
                  setIsSideNavOpen(false);
                }}
              >
                {t === "kalender" && "Kalender"}
                {t === "training" && "Training"}
                {t === "verwaltung" && "Verwaltung"}
                {t === "abrechnung" && "Abrechnung"}
              </button>
            ))}
          </nav>

          <button className="btn btnGhost sideLogout" onClick={handleLogout}>
            Logout ({authUser.email ?? "ohne Email"})
          </button>
        </aside>

        {isSideNavOpen && (
          <div
            className="sideNavOverlay"
            onClick={() => setIsSideNavOpen(false)}
          />
        )}

        <main className="mainArea">
          <div className="container">
            <div className="header">
              <div className="hTitle">
                <h1>Tennistrainer Planung</h1>
                <p>
                  Mehrere Trainer, wiederkehrende Termine, Tarife pro Stunde,
                  pro Benutzer gespeichert.
                </p>
              </div>
            </div>

            {tab === "kalender" && (
              <div className="card">
                <div className="split">
                  <div className="row calendarNav">
                    <span className="calendarWeekLabel">
                      {formatWeekRange(weekStart)}
                    </span>

                    <div className="calendarNavControls">
                      <button
                        className="navArrowBtn"
                        onClick={() => {
                          if (viewMode === "day") {
                            const newIndex = (dayIndex + 7 - 1) % 7;
                            setDayIndex(newIndex);
                            setWeekAnchor(weekDays[newIndex]);
                          } else {
                            setWeekAnchor(addDaysISO(weekStart, -7));
                          }
                        }}
                        aria-label="Vorheriger Zeitraum"
                      >
                        ‹
                      </button>
                      <button className="todayBtn" onClick={goToToday}>
                        Heute
                      </button>
                      <button
                        className="navArrowBtn"
                        onClick={() => {
                          if (viewMode === "day") {
                            const newIndex = (dayIndex + 1) % 7;
                            setDayIndex(newIndex);
                            setWeekAnchor(weekDays[newIndex]);
                          } else {
                            setWeekAnchor(addDaysISO(weekStart, 7));
                          }
                        }}
                        aria-label="Nächster Zeitraum"
                      >
                        ›
                      </button>

                      <button
                        className="btn"
                        onClick={() => {
                          resetTrainingForm();
                          setTab("training");
                        }}
                      >
                        Neues Training
                      </button>
                    </div>
                  </div>

                  <div className="row">
                    <div className="field" style={{ minWidth: 220 }}>
                      <label>Woche springen</label>
                      <input
                        type="date"
                        value={weekAnchor}
                        onChange={(e) => setWeekAnchor(e.target.value)}
                      />
                    </div>

                    {trainers.length > 1 && (
                      <div className="field" style={{ minWidth: 200 }}>
                        <label>Trainer Filter</label>
                        <select
                          value={kalenderTrainerFilter}
                          disabled={isTrainer}
                          onChange={(e) =>
                            setKalenderTrainerFilter(e.target.value)
                          }
                        >
                          {!isTrainer && (
                            <option value="alle">Alle Trainer</option>
                          )}
                          {trainers.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="row">
                      <button
                        className={`tabBtn ${
                          viewMode === "week" ? "tabBtnActive" : ""
                        }`}
                        onClick={() => setViewMode("week")}
                      >
                        Woche
                      </button>
                      <button
                        className={`tabBtn ${
                          viewMode === "day" ? "tabBtnActive" : ""
                        }`}
                        onClick={() => setViewMode("day")}
                      >
                        Tag
                      </button>
                      {viewMode === "day" && (
                        <select
                          value={dayIndex}
                          onChange={(e) => setDayIndex(Number(e.target.value))}
                          style={{ marginLeft: 8 }}
                        >
                          {weekDays.map((d, idx) => (
                            <option key={d} value={idx}>
                              {formatShort(d)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <span className="pill">
                      Trainer gesamt: <strong>{trainers.length}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div className={`kgrid ${viewMode === "day" ? "kgridDay" : ""}`}>
                  <div className="kHead">
                    <div className="kHeadCell">Zeit</div>
                    {(viewMode === "week" ? weekDays : [weekDays[dayIndex]]).map(
                      (d) => (
                        <div key={d} className="kHeadCell">
                          {formatShort(d)}
                        </div>
                      )
                    )}
                  </div>

                  <div className="kBody">
                    <div className="kTimeCol">
                      {hours.map((h) => (
                        <div key={h} className="kTime">
                          {pad2(h)}:00
                        </div>
                      ))}
                    </div>

                    {(viewMode === "week"
                      ? weekDays
                      : [weekDays[dayIndex]]
                    ).map((day) => {
                      const dayEvents = trainingsInWeek.filter(
                        (t) => t.datum === day
                      );
                      const startMin = 7 * 60;

                      return (
                        <div key={day} className="kDayCol">
                          {hours.map((h) => (
                            <div key={h} className="kHourLine" />
                          ))}

                          {dayEvents.map((t) => {
                            const top =
                              Math.max(
                                0,
                                (toMinutes(t.uhrzeitVon) - startMin) / 60
                              ) * 40;
                            const height = Math.max(
                              26,
                              ((toMinutes(t.uhrzeitBis) -
                                toMinutes(t.uhrzeitVon)) /
                                60) *
                                40
                            );
                            const tarif = t.tarifId
                              ? tarifById.get(t.tarifId)
                              : undefined;
                            const ta = tarif
                              ? tarif.abrechnung === "monatlich"
                                ? `${tarif.name} (monatlich ${tarif.preisProStunde} EUR)`
                                : tarif.name
                              : t.customPreisProStunde
                              ? `Individuell (${t.customPreisProStunde} EUR pro Stunde)`
                              : "Tarif";
                            const sp = t.spielerIds
                              .map(
                                (id) =>
                                  spielerById.get(id)?.name ?? "Spieler"
                              )
                              .join(", ");
                            const trainerName =
                              trainerById.get(
                                t.trainerId ?? defaultTrainerId
                              )?.name ?? "Trainer";

                            const taLine = isTrainer
                              ? `Trainer: ${trainerName}`
                              : trainers.length > 1
                              ? `${ta} | ${trainerName}`
                              : ta;

                            const isDone = t.status === "durchgefuehrt";
                            const isCancel = t.status === "abgesagt";
                            const isPulse = doneFlashId === t.id;

                            const bg = isDone
                              ? "rgba(34, 197, 94, 0.22)"
                              : isCancel
                              ? "rgba(239, 68, 68, 0.14)"
                              : "rgba(59, 130, 246, 0.18)";
                            const border = isDone
                              ? "rgba(34, 197, 94, 0.45)"
                              : isCancel
                              ? "rgba(239, 68, 68, 0.34)"
                              : "rgba(59, 130, 246, 0.30)";

                            return (
                              <div
                                key={t.id}
                                data-training-id={t.id}
                                className="kEvent"
                                style={{
                                  top,
                                  height,
                                  backgroundColor: bg,
                                  border: `1px solid ${border}`,
                                  opacity: isCancel ? 0.85 : 1,
                                  transform: isPulse ? "scale(1.06)" : undefined,
                                  filter: isPulse
                                    ? "brightness(1.15)"
                                    : undefined,
                                  transition:
                                    "transform 160ms ease, filter 160ms ease, background-color 180ms ease, border-color 180ms ease",
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  overflow: "hidden",
                                  padding: 8,
                                  gap: 6,
                                }}
                                onClick={() => handleCalendarEventClick(t)}
                                onDoubleClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCalendarEventDoubleClick(t);
                                }}
                                title={`Spieler: ${sp}\nZeit: ${t.uhrzeitVon} bis ${
                                  t.uhrzeitBis
                                }${
                                  isTrainer ? "" : `\nTarif: ${ta}`
                                }\nTrainer: ${trainerName}\nStatus: ${statusLabel(
                                  t.status
                                )}`}
                              >
                                <div
                                  style={{
                                    flex: "1 1 auto",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      textOverflow: "ellipsis",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {sp}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      whiteSpace: "nowrap",
                                      textOverflow: "ellipsis",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {taLine}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: "999px",
                                    border: "2px solid white",
                                    boxShadow:
                                      "0 0 0 1px rgba(15,23,42,0.15)",
                                    backgroundColor: statusDotColor(t.status),
                                    flex: "0 0 auto",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 12 }} />
                <div className="muted">
                  Hinweis: Klick: Bearbeiten, Doppelklick: Abschließen.
                </div>
              </div>
            )}

            {tab === "training" &&
              (isTrainer ? (
                <div className="card">
                  <h2>Nur Lesen für Trainer</h2>
                  <p className="muted">
                    Trainings können nur vom Hauptaccount angelegt oder
                    bearbeitet werden.
                  </p>
                </div>
              ) : (
                <div className="grid2">
                  <div className="card">
                    <h2>
                      {selectedTrainingId
                        ? "Training bearbeiten"
                        : "Training anlegen"}
                    </h2>
                    <div className="row">
                      <div className="field">
                        <label>Datum</label>
                        <input
                          type="date"
                          value={tDatum}
                          onChange={(e) => setTDatum(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Von</label>
                        <input
                          type="time"
                          value={tVon}
                          onChange={(e) => setTVon(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Bis</label>
                        <input
                          type="time"
                          value={tBis}
                          onChange={(e) => setTBis(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Trainer</label>
                        <select
                          value={tTrainerId}
                          disabled={isTrainer}
                          onChange={(e) => setTTrainerId(e.target.value)}
                        >
                          {trainerOptionsForSelect.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Tarif (optional)</label>
                        <select
                          value={tTarifId}
                          onChange={(e) => setTTarifId(e.target.value)}
                        >
                          <option value="">
                            Kein Tarif, individuellen Preis verwenden
                          </option>
                          {tarife.map((t) => {
                            const beschreibung =
                              t.abrechnung === "monatlich"
                                ? `${t.preisProStunde} EUR monatlich`
                                : `${t.preisProStunde} EUR pro Stunde, ${
                                    t.abrechnung === "proSpieler"
                                      ? "pro Spieler"
                                      : "pro Training"
                                  }`;
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name}, {beschreibung}
                              </option>
                            );
                          })}
                        </select>
                        <div className="muted">
                          Entweder einen Tarif auswählen oder unten einen
                          individuellen Preis pro Stunde eingeben.
                        </div>
                      </div>

                      <div className="field">
                        <label>Status</label>
                        <select
                          value={tStatus}
                          onChange={(e) =>
                            setTStatus(e.target.value as TrainingStatus)
                          }
                        >
                          <option value="geplant">Geplant</option>
                          <option value="durchgefuehrt">Durchgeführt</option>
                          <option value="abgesagt">Abgesagt</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Individueller Preis pro Stunde</label>
                        <input
                          type="number"
                          value={
                            tCustomPreisProStunde === ""
                              ? ""
                              : tCustomPreisProStunde
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setTCustomPreisProStunde("");
                            } else {
                              const n = Number(v);
                              setTCustomPreisProStunde(
                                Number.isFinite(n) ? n : ""
                              );
                            }
                          }}
                          placeholder="z.B. 60"
                          disabled={!!tTarifId}
                        />
                      </div>
                      <div className="field">
                        <label>Individuelle Abrechnung</label>
                        <select
                          value={tCustomAbrechnung}
                          onChange={(e) =>
                            setTCustomAbrechnung(
                              e.target.value as "proTraining" | "proSpieler"
                            )
                          }
                          disabled={!!tTarifId}
                        >
                          <option value="proTraining">Pro Training</option>
                          <option value="proSpieler">Pro Spieler</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field" style={{ minWidth: 260 }}>
                        <label>Notiz</label>
                        <input
                          value={tNotiz}
                          onChange={(e) => setTNotiz(e.target.value)}
                          placeholder="optional"
                        />
                      </div>
                    </div>

                    <div style={{ height: 10 }} />

                    {!selectedTrainingId && (
                      <div className="card cardInset">
                        <h2>Wiederholung</h2>
                        <div className="row">
                          <label
                            className="pill"
                            style={{ cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={repeatWeekly}
                              onChange={(e) =>
                                setRepeatWeekly(e.target.checked)
                              }
                              style={{ marginRight: 8 }}
                            />
                            Wöchentlich wiederholen
                          </label>
                          <div className="field" style={{ minWidth: 220 }}>
                            <label>Bis Datum</label>
                            <input
                              type="date"
                              value={repeatUntil}
                              onChange={(e) =>
                                setRepeatUntil(e.target.value)
                              }
                              disabled={!repeatWeekly}
                            />
                          </div>
                          <span className="pill">
                            Trainer: <strong>{selectedTrainerName}</strong>
                          </span>
                        </div>
                        <div className="muted">
                          Wenn aktiv: Es werden alle Termine wöchentlich bis zum
                          Bis Datum angelegt.
                        </div>
                      </div>
                    )}

                    {selectedTrainingId &&
                      (() => {
                        const ex = trainings.find(
                          (x) => x.id === selectedTrainingId
                        );
                        if (!ex?.serieId) return null;
                        return (
                          <div className="card cardInset">
                            <h2>Serie bearbeiten</h2>
                            <div className="row">
                              <div className="field">
                                <label>Änderungen anwenden</label>
                                <select
                                  value={applySerieScope}
                                  onChange={(e) =>
                                    setApplySerieScope(
                                      e.target.value as
                                        | "nurDieses"
                                        | "abHeute"
                                    )
                                  }
                                >
                                  <option value="nurDieses">
                                    Nur diesen Termin
                                  </option>
                                  <option value="abHeute">
                                    Alle Termine der Serie ab diesem Datum
                                  </option>
                                </select>
                              </div>
                              <span className="pill">
                                Serie:{" "}
                                <strong>{ex.serieId.slice(0, 8)}</strong>
                              </span>
                            </div>
                            <div className="muted">
                              Bei ab diesem Datum: Uhrzeiten, Spieler, Tarif,
                              Status und Notiz werden für alle zukünftigen
                              Termine übernommen. Beim Löschen mit dieser Option
                              werden alle zukünftigen Termine der Serie entfernt.
                            </div>
                          </div>
                        );
                      })()}

                    <div style={{ height: 10 }} />

                    <div className="row">
                      <button className="btn" onClick={saveTraining}>
                        {selectedTrainingId
                          ? "Änderungen speichern"
                          : "Training speichern"}
                      </button>
                      <button
                        className="btn btnGhost"
                        onClick={() => {
                          resetTrainingForm();
                          setTab("kalender");
                        }}
                      >
                        Zurück zum Kalender
                      </button>
                      {selectedTrainingId && (
                        <button
                          className="btn btnWarn"
                          onClick={() => deleteTraining(selectedTrainingId)}
                        >
                          Training löschen
                        </button>
                      )}
                      <span className="pill">
                        Preis Vorschau:{" "}
                        <strong>{euro(preisVorschau)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="card">
                    <h2>Spieler auswählen</h2>
                    <div className="row">
                      <div className="field">
                        <label>Suche</label>
                        <input
                          value={spielerSuche}
                          onChange={(e) => setSpielerSuche(e.target.value)}
                          placeholder="Name oder Email"
                        />
                      </div>
                      <span className="pill">
                        Ausgewählt:{" "}
                        <strong>{tSpielerIds.length}</strong>
                      </span>
                    </div>

                    <ul className="list">
                      {filteredSpielerForPick.map((s) => {
                        const checked = tSpielerIds.includes(s.id);
                        return (
                          <li key={s.id} className="listItem">
                            <div>
                              <strong>{s.name}</strong>
                              <div className="muted">
                                {s.kontaktEmail ?? ""}
                                {s.kontaktTelefon
                                  ? `, ${s.kontaktTelefon}`
                                  : ""}
                              </div>
                              {s.rechnungsAdresse ? (
                                <div className="muted">
                                  Rechnungsadresse: {s.rechnungsAdresse}
                                </div>
                              ) : null}
                              {s.notizen ? (
                                <div className="muted">{s.notizen}</div>
                              ) : null}
                            </div>
                            <div className="smallActions">
                              <button
                                className={`btn micro ${
                                  checked ? "" : "btnGhost"
                                }`}
                                onClick={() => toggleSpielerPick(s.id)}
                              >
                                {checked ? "Entfernen" : "Hinzufügen"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}

            {tab === "verwaltung" && !isTrainer && (
              <>
                <div className="subTabs">
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "trainer" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("trainer")}
                  >
                    Trainer
                  </button>
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "spieler" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("spieler")}
                  >
                    Spieler
                  </button>
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "tarife" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("tarife")}
                  >
                    Tarife
                  </button>
                </div>

                <div style={{ height: 12 }} />

                {verwaltungTab === "trainer" && (
                  <div className="card">
                    <h2>Trainer verwalten</h2>
                    <div className="row">
                      <div className="field">
                        <label>Name</label>
                        <input
                          value={trainerName}
                          onChange={(e) => setTrainerName(e.target.value)}
                          placeholder="z.B. Jesper"
                        />
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input
                          value={trainerEmail}
                          onChange={(e) => setTrainerEmail(e.target.value)}
                          placeholder="z.B. trainer@example.com"
                        />
                      </div>
                      <div className="field">
                        <label>Stundensatz Trainer Honorar</label>
                        <input
                          type="number"
                          value={
                            trainerStundensatz === ""
                              ? ""
                              : trainerStundensatz
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setTrainerStundensatz("");
                            } else {
                              const n = Number(v);
                              setTrainerStundensatz(
                                Number.isFinite(n) ? n : ""
                              );
                            }
                          }}
                          placeholder="z.B. 20"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <button
                        className="btn"
                        onClick={editingTrainerId ? saveTrainer : addTrainer}
                      >
                        {editingTrainerId
                          ? "Trainer speichern"
                          : "Trainer hinzufügen"}
                      </button>
                      {editingTrainerId && (
                        <button
                          className="btn btnGhost"
                          onClick={() => {
                            setEditingTrainerId(null);
                            setTrainerName("");
                            setTrainerEmail("");
                            setTrainerStundensatz(0);
                          }}
                        >
                          Abbrechen
                        </button>
                      )}
                    </div>

                    <ul className="list">
                      {trainers.map((t) => (
                        <li key={t.id} className="listItem">
                          <div>
                            <strong>{t.name}</strong>
                            {t.email && (
                              <div className="muted">{t.email}</div>
                            )}
                            <div className="muted">
                              Honorar: {euro(t.stundensatz ?? 0)} pro Stunde
                            </div>
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => startEditTrainer(t)}
                            >
                              Bearbeiten
                            </button>
                            {trainers.length > 1 && (
                              <button
                                className="btn micro btnWarn"
                                onClick={() => deleteTrainer(t.id)}
                              >
                                Löschen
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verwaltungTab === "spieler" && (
                  <div className="card">
                    <h2>Spieler verwalten</h2>
                    <div className="row">
                      <div className="field">
                        <label>Name</label>
                        <input
                          value={spielerName}
                          onChange={(e) => setSpielerName(e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input
                          value={spielerEmail}
                          onChange={(e) => setSpielerEmail(e.target.value)}
                          placeholder="Kontakt Email"
                        />
                      </div>
                      <div className="field">
                        <label>Telefon</label>
                        <input
                          value={spielerTelefon}
                          onChange={(e) => setSpielerTelefon(e.target.value)}
                          placeholder="Telefon"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="field" style={{ minWidth: 260 }}>
                        <label>Rechnungsadresse</label>
                        <input
                          value={spielerRechnung}
                          onChange={(e) => setSpielerRechnung(e.target.value)}
                          placeholder="optional"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="field" style={{ minWidth: 260 }}>
                        <label>Notizen</label>
                        <input
                          value={spielerNotizen}
                          onChange={(e) => setSpielerNotizen(e.target.value)}
                          placeholder="optional"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <button
                        className="btn"
                        onClick={editingSpielerId ? saveSpieler : addSpieler}
                      >
                        {editingSpielerId
                          ? "Spieler speichern"
                          : "Spieler hinzufügen"}
                      </button>
                      {editingSpielerId && (
                        <button
                          className="btn btnGhost"
                          onClick={() => {
                            setEditingSpielerId(null);
                            setSpielerName("");
                            setSpielerEmail("");
                            setSpielerTelefon("");
                            setSpielerRechnung("");
                            setSpielerNotizen("");
                          }}
                        >
                          Abbrechen
                        </button>
                      )}
                    </div>

                    <ul className="list">
                      {spieler.map((s) => (
                        <li key={s.id} className="listItem">
                          <div>
                            <strong>{s.name}</strong>
                            <div className="muted">
                              {s.kontaktEmail ?? ""}
                              {s.kontaktTelefon
                                ? `, ${s.kontaktTelefon}`
                                : ""}
                            </div>
                            {s.rechnungsAdresse && (
                              <div className="muted">
                                Rechnungsadresse: {s.rechnungsAdresse}
                              </div>
                            )}
                            {s.notizen && (
                              <div className="muted">{s.notizen}</div>
                            )}
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => startEditSpieler(s)}
                            >
                              Bearbeiten
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verwaltungTab === "tarife" && (
                  <div className="card">
                    <h2>Tarife verwalten</h2>
                    <div className="row">
                      <div className="field">
                        <label>Name</label>
                        <input
                          value={tarifName}
                          onChange={(e) => setTarifName(e.target.value)}
                          placeholder="z.B. Gruppentraining"
                        />
                      </div>
                      <div className="field">
                        <label>Preis pro Stunde</label>
                        <input
                          type="number"
                          value={tarifPreisProStunde}
                          onChange={(e) =>
                            setTarifPreisProStunde(
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Abrechnung</label>
                        <select
                          value={tarifAbrechnung}
                          onChange={(e) =>
                            setTarifAbrechnung(
                              e.target.value as
                                | "proTraining"
                                | "proSpieler"
                                | "monatlich"
                            )
                          }
                        >
                          <option value="proTraining">Pro Training</option>
                          <option value="proSpieler">Pro Spieler</option>
                          <option value="monatlich">Monatlich</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field" style={{ minWidth: 260 }}>
                        <label>Beschreibung</label>
                        <input
                          value={tarifBeschreibung}
                          onChange={(e) =>
                            setTarifBeschreibung(e.target.value)
                          }
                          placeholder="optional"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <button
                        className="btn"
                        onClick={editingTarifId ? saveTarif : addTarif}
                      >
                        {editingTarifId
                          ? "Tarif speichern"
                          : "Tarif hinzufügen"}
                      </button>
                      {editingTarifId && (
                        <button
                          className="btn btnGhost"
                          onClick={() => {
                            setEditingTarifId(null);
                            setTarifName("");
                            setTarifPreisProStunde(60);
                            setTarifAbrechnung("proTraining");
                            setTarifBeschreibung("");
                          }}
                        >
                          Abbrechen
                        </button>
                      )}
                    </div>

                    <ul className="list">
                      {tarife.map((t) => (
                        <li key={t.id} className="listItem">
                          <div>
                            <strong>{t.name}</strong>
                            <div className="muted">
                              {t.abrechnung === "monatlich"
                                ? `${t.preisProStunde} EUR monatlich`
                                : `${t.preisProStunde} EUR pro Stunde, ${
                                    t.abrechnung === "proSpieler"
                                      ? "pro Spieler"
                                      : "pro Training"
                                  }`}
                            </div>
                            {t.beschreibung && (
                              <div className="muted">{t.beschreibung}</div>
                            )}
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => startEditTarif(t)}
                            >
                              Bearbeiten
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {tab === "verwaltung" && isTrainer && (
              <div className="card">
                <h2>Kein Zugriff</h2>
                <p className="muted">
                  Die Verwaltung ist nur für den Hauptaccount verfügbar.
                </p>
              </div>
            )}

            {tab === "abrechnung" && (
              <div className="card">
                <h2>Abrechnung</h2>

                <div className="row">
                  <div className="field">
                    <label>Monat</label>
                    <input
                      type="month"
                      value={abrechnungMonat}
                      onChange={(e) => setAbrechnungMonat(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Filter</label>
                    <select
                      value={abrechnungFilter}
                      onChange={(e) =>
                        setAbrechnungFilter(
                          e.target.value as AbrechnungFilter
                        )
                      }
                    >
                      <option value="alle">Alle</option>
                      <option value="bezahlt">Nur bezahlt</option>
                      <option value="offen">Nur offen</option>
                      <option value="bar">Nur bar bezahlt</option>
                    </select>
                  </div>
                  {trainers.length > 1 && (
                    <div className="field">
                      <label>Trainer</label>
                      <select
                        value={abrechnungTrainerFilter}
                        disabled={isTrainer}
                        onChange={(e) =>
                          setAbrechnungTrainerFilter(e.target.value)
                        }
                      >
                        {!isTrainer && (
                          <option value="alle">Alle Trainer</option>
                        )}
                        {trainers.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!isTrainer && (
                  <div className="subTabs">
                    <button
                      className={`tabBtn ${
                        abrechnungTab === "spieler" ? "tabBtnActive" : ""
                      }`}
                      onClick={() => setAbrechnungTab("spieler")}
                    >
                      Spieler Abrechnung
                    </button>
                    <button
                      className={`tabBtn ${
                        abrechnungTab === "trainer" ? "tabBtnActive" : ""
                      }`}
                      onClick={() => setAbrechnungTab("trainer")}
                    >
                      Trainer Abrechnung
                    </button>
                  </div>
                )}

                {abrechnungTab === "spieler" && !isTrainer && (
                  <>
                    <div className="row" style={{ marginTop: 12 }}>
                      <span className="pill">
                        Umsatz gesamt:{" "}
                        <strong>{euro(abrechnung.total)}</strong>
                      </span>

                      {abrechnung.barTotal > 0 && (
                        <>
                          <span className="pill">
                            Bar bezahlt (Stunden):{" "}
                            <strong>{euro(abrechnung.barTotal)}</strong>
                          </span>
                          <span className="pill">
                            Umsatz inkl. Bar:{" "}
                            <strong>{euro(abrechnung.totalMitBar)}</strong>
                          </span>
                        </>
                      )}

                      <span className="pill">
                        Bereits bezahlt:{" "}
                        <strong>{euro(sumBezahlt)}</strong>
                      </span>
                      <span className="pill">
                        Offen: <strong>{euro(sumOffen)}</strong>
                      </span>
                    </div>

                    <div style={{ height: 10 }} />
                    <div className="muted">
                      Hinweis: Der Status bezahlt gilt immer für einen Spieler im
                      ausgewählten Monat.
                    </div>

                    <div style={{ height: 14 }} />
                    <div className="card cardInset">
                      <h2>Summe pro Spieler</h2>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Spieler</th>
                            <th>Aufstellung</th>
                            <th>Summe</th>
                            <th>Status</th>
                            <th>Aktion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSpielerRowsForMonth.map((r) => {
                            const breakdownText =
                              r.breakdown.length === 0
                                ? "-"
                                : r.breakdown
                                    .map(
                                      (b) =>
                                        `${b.count} × ${euro(b.amount)}`
                                    )
                                    .join(" + ");
                            const key = paymentKey(abrechnungMonat, r.id);
                            const paid = payments[key] ?? false;

                            const hasBarForPlayer = trainingsInMonth.some(
                              (t) =>
                                t.barBezahlt &&
                                t.spielerIds.includes(r.id)
                            );

                            const buttonLabel =
                              hasBarForPlayer && !paid
                                ? "bar bezahlt"
                                : paid
                                ? "als offen markieren"
                                : "als bezahlt markieren";

                            const buttonStyle =
                              hasBarForPlayer && !paid
                                ? {
                                    backgroundColor: "#dc2626",
                                    borderColor: "#dc2626",
                                  }
                                : undefined;

                            return (
                              <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>{breakdownText}</td>
                                <td>{euro(r.sum)}</td>
                                <td>
                                  <span
                                    className={
                                      paid ? "badge badgeOk" : "badge"
                                    }
                                  >
                                    {paid ? "bezahlt" : "offen"}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn micro"
                                    style={buttonStyle}
                                    onClick={() => {
                                      if (paid) {
                                        togglePaidForPlayer(
                                          abrechnungMonat,
                                          r.id
                                        );
                                      } else {
                                        openPayConfirm(
                                          abrechnungMonat,
                                          r.id,
                                          r.name,
                                          r.sum
                                        );
                                      }
                                    }}
                                  >
                                    {buttonLabel}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {abrechnungTab === "trainer" && (
                  <>
                    <div className="row" style={{ marginTop: 12 }}>
                      <span className="pill">
                        Umsatz gesamt:{" "}
                        <strong>{euro(abrechnungTrainer.total)}</strong>
                      </span>
                      <span className="pill">
                        Trainer Honorar gesamt:{" "}
                        <strong>{euro(trainerHonorarTotal)}</strong>
                      </span>
                      <span className="pill">
                        Honorar bezahlt:{" "}
                        <strong>{euro(trainerHonorarBezahltTotal)}</strong>
                      </span>
                      <span className="pill">
                        Honorar offen:{" "}
                        <strong>{euro(trainerHonorarOffenTotal)}</strong>
                      </span>
                      <span className="pill">
                        Rückzahlung Trainer gesamt:{" "}
                        <strong>{euro(trainerRueckzahlungTotal)}</strong>
                      </span>
                    </div>

                    <div style={{ height: 10 }} />
                    <div className="muted">
                      Hinweis: Das Trainerhonorar wird pro Training abgerechnet.
                      Bei Barzahlung durch den Schüler muss der Trainer die
                      Differenz aus Schülerzahlung minus Honorar zurückzahlen.
                    </div>

                    {!isTrainer && trainers.length > 1 && (
                      <>
                        <div style={{ height: 14 }} />
                        <div className="card cardInset">
                          <h2>Summe pro Trainer</h2>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Trainer</th>
                                <th>Trainings</th>
                                <th>Umsatz</th>
                                <th>Trainer Honorar</th>
                                <th>Honorar bezahlt</th>
                                <th>Honorar offen</th>
                                <th>Rückzahlung (Bar)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {abrechnungTrainer.rows.map((r) => (
                                <tr key={r.id}>
                                  <td>{r.name}</td>
                                  <td>{r.trainings}</td>
                                  <td>{euro(r.sum)}</td>
                                  <td>{euro(r.honorar)}</td>
                                  <td>{euro(r.honorarBezahlt)}</td>
                                  <td>{euro(r.honorarOffen)}</td>
                                  <td>{euro(r.barDifferenz)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div style={{ height: 14 }} />
                <h2>Trainings im Monat</h2>
                <ul className="list">
                  {trainingsForAbrechnung.map((t) => {
                    const tarif = t.tarifId
                      ? tarifById.get(t.tarifId)
                      : undefined;
                    const ta = tarif
                      ? tarif.abrechnung === "monatlich"
                        ? `${tarif.name} (monatlich ${tarif.preisProStunde} EUR)`
                        : tarif.name
                      : t.customPreisProStunde
                      ? `Individuell (${t.customPreisProStunde} EUR pro Stunde)`
                      : "Tarif";
                    const sp = t.spielerIds
                      .map((id) => spielerById.get(id)?.name ?? "Spieler")
                      .join(", ");
                    const trainerName =
                      trainerById.get(t.trainerId ?? defaultTrainerId)?.name ??
                      "Trainer";
                    const priceNum = round2(trainingPreisGesamt(t));
                    const price = euro(priceNum);
                    const honorarNum = trainerHonorarFuerTraining(t);
                    const honorarBadge = euro(honorarNum);
                    const trainerPaid = trainerPayments[t.id] ?? false;
                    const showTrainerInfo =
                      isTrainer || abrechnungTab === "trainer";
                    const differenz = round2(priceNum - honorarNum);

                    return (
                      <li key={t.id} className="listItem">
                        <div>
                          <strong>
                            {t.datum} {t.uhrzeitVon} bis {t.uhrzeitBis}
                          </strong>
                          <div className="muted">
                            {showTrainerInfo
                              ? `${sp}, ${ta}, ${trainerName}, Honorar: ${honorarBadge}`
                              : `${sp}, ${ta}, ${trainerName}`}
                          </div>
                          {showTrainerInfo && (
                            <div className="muted">
                              Differenz (Schülerzahlung − Honorar):{" "}
                              {euro(differenz)}
                            </div>
                          )}
                          {t.notiz ? (
                            <div className="muted">{t.notiz}</div>
                          ) : null}
                          {t.serieId ? (
                            <div className="muted">
                              Serie: {t.serieId.slice(0, 8)}
                            </div>
                          ) : null}
                          {t.barBezahlt && (
                            <div className="muted">Bar bezahlt</div>
                          )}
                        </div>
                        <div className="smallActions">
                          <span className="badge badgeOk">durchgeführt</span>
                          {!isTrainer && (
                            <span className="badge">{price}</span>
                          )}
                          {showTrainerInfo && (
                            <>
                              <span className="badge">
                                Honorar: {honorarBadge}
                              </span>
                              <span
                                className={
                                  trainerPaid ? "badge badgeOk" : "badge"
                                }
                              >
                                {trainerPaid
                                  ? "Honorar abgerechnet"
                                  : "Honorar offen"}
                              </span>
                            </>
                          )}
                          {!isTrainer && (
                            <>
                              <button
                                className="btn micro"
                                style={{
                                  backgroundColor: "#8b5cf6",
                                  borderColor: "#8b5cf6",
                                }}
                                onClick={() => toggleBarBezahlt(t.id)}
                              >
                                {t.barBezahlt
                                  ? "Barzahlung zurücknehmen"
                                  : "Bar bezahlt"}
                              </button>
                              {abrechnungTab === "trainer" && (
                                <>
                                  <button
                                    className="btn micro btnGhost"
                                    onClick={() => toggleTrainerPaid(t.id)}
                                  >
                                    {trainerPaid
                                      ? "Honorar als offen markieren"
                                      : "Honorar als abgerechnet markieren"}
                                  </button>
                                  <button
                                    className="btn micro btnGhost"
                                    onClick={() =>
                                      fillTrainingFromSelected(t)
                                    }
                                  >
                                    Bearbeiten
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>

      {payConfirm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <div className="modalHeader">
              <div className="modalPill">Zahlung bestätigen</div>
              <h3>
                {payConfirm.spielerName} ·{" "}
                {formatMonthLabel(payConfirm.monat)}
              </h3>
              <p className="muted">
                Dieser Betrag wird als bezahlt markiert, Du kannst es später
                wieder auf offen stellen.
              </p>
            </div>
            <div className="modalSummary">
              <span className="muted">Betrag</span>
              <strong>{euro(payConfirm.amount)}</strong>
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" onClick={closePayConfirm}>
                Abbrechen
              </button>
              <button className="btn" onClick={confirmPay}>
                Ja, als bezahlt markieren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

