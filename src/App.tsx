import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type TrainerSingle = {
  name: string;
  email?: string;
};

type Spieler = {
  id: string;
  name: string;
  kontaktEmail?: string;
  kontaktTelefon?: string;
  notizen?: string;
  rechnungsAdresse?: string;
};

type Tarif = {
  id: string;
  name: string;
  preisProStunde: number;
  abrechnung: "proTraining" | "proSpieler";
  beschreibung?: string;
};

type TrainingStatus = "geplant" | "durchgefuehrt" | "abgesagt";

type Training = {
  id: string;
  datum: string;
  uhrzeitVon: string;
  uhrzeitBis: string;
  spielerIds: string[];
  tarifId: string;
  status: TrainingStatus;
  notiz?: string;
  serieId?: string;
};

type AbrechnungPaid = {
  [monat: string]: string[];
};

type AppState = {
  trainer: TrainerSingle;
  spieler: Spieler[];
  tarife: Tarif[];
  trainings: Training[];
  abrechnungPaid?: AbrechnungPaid;
};

type Tab = "kalender" | "training" | "verwaltung" | "abrechnung";

const STORAGE_KEY = "tennis_planner_single_trainer";
const LEGACY_KEYS = [
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

function euro(n: number) {
  if (!Number.isFinite(n)) return "0,00 €";
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function statusLabel(s: TrainingStatus) {
  return s === "geplant" ? "offen" : s === "durchgefuehrt" ? "durchgeführt" : "abgesagt";
}

function statusBadge(s: TrainingStatus) {
  const isDone = s === "durchgefuehrt";
  const isCancel = s === "abgesagt";
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
    <span
      style={{
        flex: "0 0 auto",
        width: 12,
        height: 12,
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
      }}
      title={statusLabel(s)}
    />
  );
}

function normalizeState(parsed: Partial<AppState> | null | undefined): AppState {
  return {
    trainer: parsed?.trainer ?? { name: "Trainer", email: "" },
    spieler: parsed?.spieler ?? [],
    tarife: parsed?.tarife ?? [],
    trainings: parsed?.trainings ?? [],
    abrechnungPaid: parsed?.abrechnungPaid ?? {},
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
    if (legacy) return { state: normalizeState(legacy), usedKey: k };
  }

  return { state: normalizeState(null), usedKey: null };
}

function writeState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function App() {
  const initialRef = useRef<{ state: AppState; usedKey: string | null } | null>(null);
  if (initialRef.current === null) {
    initialRef.current = readStateWithMeta();
  }
  const initial = initialRef.current;

  const [tab, setTab] = useState<Tab>("kalender");

  const [trainer, setTrainer] = useState<TrainerSingle>(initial.state.trainer);
  const [spieler, setSpieler] = useState<Spieler[]>(initial.state.spieler);
  const [tarife, setTarife] = useState<Tarif[]>(initial.state.tarife);
  const [trainings, setTrainings] = useState<Training[]>(initial.state.trainings);
  const [abrechnungPaid, setAbrechnungPaid] = useState<AbrechnungPaid>(initial.state.abrechnungPaid ?? {});

  const [weekAnchor, setWeekAnchor] = useState<string>(todayISO());

  const [trainerName, setTrainerName] = useState(initial.state.trainer.name);
  const [trainerEmail, setTrainerEmail] = useState(initial.state.trainer.email ?? "");

  const [spielerName, setSpielerName] = useState("");
  const [spielerEmail, setSpielerEmail] = useState("");
  const [spielerTelefon, setSpielerTelefon] = useState("");
  const [spielerNotizen, setSpielerNotizen] = useState("");
  const [spielerRechnungsAdresse, setSpielerRechnungsAdresse] = useState("");
  const [editingSpielerId, setEditingSpielerId] = useState<string | null>(null);

  const [tarifName, setTarifName] = useState("");
  const [tarifPreisProStunde, setTarifPreisProStunde] = useState(60);
  const [tarifAbrechnung, setTarifAbrechnung] = useState<"proTraining" | "proSpieler">("proTraining");
  const [tarifBeschreibung, setTarifBeschreibung] = useState("");
  const [editingTarifId, setEditingTarifId] = useState<string | null>(null);

  const [tDatum, setTDatum] = useState(todayISO());
  const [tVon, setTVon] = useState("16:00");
  const [tBis, setTBis] = useState("17:00");
  const [tTarifId, setTTarifId] = useState("");
  const [tStatus, setTStatus] = useState<TrainingStatus>("geplant");
  const [tNotiz, setTNotiz] = useState("");

  const [spielerSuche, setSpielerSuche] = useState("");
  const [tSpielerIds, setTSpielerIds] = useState<string[]>([]);

  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState(() => addDaysISO(todayISO(), 56));
  const [applySerieScope, setApplySerieScope] = useState<"nurDieses" | "abHeute">("nurDieses");

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);

  const [abrechnungMonat, setAbrechnungMonat] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const clickTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [doneFlashId, setDoneFlashId] = useState<string | null>(null);

  const hasMountedRef = useRef(false);

  useEffect(() => {
    const usedKey = initial.usedKey;
    if (usedKey && usedKey !== STORAGE_KEY) {
      writeState(initial.state);
      for (const k of LEGACY_KEYS) {
        if (k !== STORAGE_KEY && localStorage.getItem(k)) localStorage.removeItem(k);
      }
    }
    hasMountedRef.current = true;
  }, [initial.usedKey, initial.state]);

  useEffect(() => {
    if (!hasMountedRef.current) return;
    writeState({ trainer, spieler, tarife, trainings, abrechnungPaid });
  }, [trainer, spieler, tarife, trainings, abrechnungPaid]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const spielerById = useMemo(() => new Map(spieler.map((s) => [s.id, s])), [spieler]);
  const tarifById = useMemo(() => new Map(tarife.map((t) => [t.id, t])), [tarife]);

  const weekStart = useMemo(() => startOfWeekISO(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);

  const hours = useMemo(() => {
    const startHour = 7;
    const endHour = 22;
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  }, []);

  const trainingsInWeek = useMemo(() => {
    const end = addDaysISO(weekStart, 7);
    return trainings
      .filter((t) => t.datum >= weekStart && t.datum < end)
      .sort((a, b) => (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon));
  }, [trainings, weekStart]);

  const filteredSpielerForPick = useMemo(() => {
    const q = spielerSuche.trim().toLowerCase();
    if (!q) return spieler;
    return spieler.filter((s) => {
      const mail = (s.kontaktEmail ?? "").toLowerCase();
      const tel = (s.kontaktTelefon ?? "").toLowerCase();
      const addr = (s.rechnungsAdresse ?? "").toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        mail.includes(q) ||
        tel.includes(q) ||
        addr.includes(q)
      );
    });
  }, [spieler, spielerSuche]);

  function addSpieler() {
    const name = spielerName.trim();
    if (!name) return;

    if (editingSpielerId) {
      setSpieler((prev) =>
        prev.map((s) =>
          s.id === editingSpielerId
            ? {
                ...s,
                name,
                kontaktEmail: spielerEmail.trim() || undefined,
                kontaktTelefon: spielerTelefon.trim() || undefined,
                notizen: spielerNotizen.trim() || undefined,
                rechnungsAdresse: spielerRechnungsAdresse.trim() || undefined,
              }
            : s
        )
      );
    } else {
      const neu: Spieler = {
        id: uid(),
        name,
        kontaktEmail: spielerEmail.trim() || undefined,
        kontaktTelefon: spielerTelefon.trim() || undefined,
        notizen: spielerNotizen.trim() || undefined,
        rechnungsAdresse: spielerRechnungsAdresse.trim() || undefined,
      };
      setSpieler((prev) => [...prev, neu]);
    }

    setSpielerName("");
    setSpielerEmail("");
    setSpielerTelefon("");
    setSpielerNotizen("");
    setSpielerRechnungsAdresse("");
    setEditingSpielerId(null);
  }

  function addTarif() {
    const name = tarifName.trim();
    if (!name) return;

    if (editingTarifId) {
      setTarife((prev) =>
        prev.map((t) =>
          t.id === editingTarifId
            ? {
                ...t,
                name,
                preisProStunde: Number.isFinite(tarifPreisProStunde) ? tarifPreisProStunde : 0,
                abrechnung: tarifAbrechnung,
                beschreibung: tarifBeschreibung.trim() || undefined,
              }
            : t
        )
      );
    } else {
      const neu: Tarif = {
        id: uid(),
        name,
        preisProStunde: Number.isFinite(tarifPreisProStunde) ? tarifPreisProStunde : 0,
        abrechnung: tarifAbrechnung,
        beschreibung: tarifBeschreibung.trim() || undefined,
      };
      setTarife((prev) => [...prev, neu]);
      setTTarifId((prev) => (prev ? prev : neu.id));
    }

    setTarifName("");
    setTarifPreisProStunde(60);
    setTarifAbrechnung("proTraining");
    setTarifBeschreibung("");
    setEditingTarifId(null);
  }

  function toggleSpielerPick(id: string) {
    setTSpielerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function durationMin(von: string, bis: string) {
    const a = toMinutes(von);
    const b = toMinutes(bis);
    return Math.max(0, b - a);
  }

  function trainingPreisGesamt(t: Training) {
    const tarif = tarifById.get(t.tarifId);
    if (!tarif) return 0;
    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = tarif.preisProStunde * (mins / 60);
    if (tarif.abrechnung === "proSpieler") return basis * t.spielerIds.length;
    return basis;
  }

  function priceFürSpieler(t: Training) {
    const tarif = tarifById.get(t.tarifId);
    if (!tarif) return 0;
    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = tarif.preisProStunde * (mins / 60);
    if (tarif.abrechnung === "proSpieler") return basis;
    const n = Math.max(1, t.spielerIds.length);
    return basis / n;
  }

  function fillTrainingFromSelected(t: Training) {
    setTDatum(t.datum);
    setTVon(t.uhrzeitVon);
    setTBis(t.uhrzeitBis);
    setTTarifId(t.tarifId);
    setTStatus(t.status);
    setTNotiz(t.notiz ?? "");
    setTSpielerIds(t.spielerIds);
    setSelectedTrainingId(t.id);
    setRepeatWeekly(false);
    setApplySerieScope("nurDieses");
    setTab("training");
  }

  function resetTrainingForm() {
    setSelectedTrainingId(null);
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
  }

  function deleteTraining(id: string) {
    setTrainings((prev) => prev.filter((t) => t.id !== id));
    if (selectedTrainingId === id) resetTrainingForm();
  }

  function triggerDonePulse(trainingId: string) {
    setDoneFlashId(trainingId);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setDoneFlashId((prev) => (prev === trainingId ? null : prev));
    }, 650);

    const el = document.querySelector(`[data-training-id="${trainingId}"]`) as HTMLElement | null;
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
    if (!tDatum || !tVon || !tBis || !tTarifId || tSpielerIds.length === 0) return;
    const mins = durationMin(tVon, tBis);
    if (mins <= 0) return;

    const existing = selectedTrainingId ? trainings.find((x) => x.id === selectedTrainingId) : undefined;

    if (selectedTrainingId && existing) {
      const payload: Training = {
        ...existing,
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: tTarifId,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
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
              tarifId: payload.tarifId,
              spielerIds: payload.spielerIds,
              status: payload.status,
              notiz: payload.notiz,
            };
          })
        );
      } else {
        setTrainings((prev) => prev.map((x) => (x.id === selectedTrainingId ? payload : x)));
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
          tarifId: tTarifId,
          spielerIds: tSpielerIds,
          status: tStatus,
          notiz: tNotiz.trim() || undefined,
          serieId,
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
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: tTarifId,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
      },
    ]);

    resetTrainingForm();
    setTab("kalender");
  }

  const preisVorschau = (() => {
    if (!tTarifId || tSpielerIds.length === 0) return 0;
    const fake: Training = {
      id: "x",
      datum: tDatum,
      uhrzeitVon: tVon,
      uhrzeitBis: tBis,
      tarifId: tTarifId,
      spielerIds: tSpielerIds,
      status: tStatus,
      notiz: tNotiz || undefined,
    };
    return trainingPreisGesamt(fake);
  })();

  const nextTrainings = useMemo(() => {
    const t0 = todayISO();
    return trainings
      .slice()
      .sort((a, b) => (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon))
      .filter((t) => t.datum >= t0)
      .slice(0, 20);
  }, [trainings]);

  const trainingsInMonth = useMemo(
    () =>
      trainings
        .filter((t) => t.datum.startsWith(abrechnungMonat))
        .sort((a, b) => (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon)),
    [trainings, abrechnungMonat]
  );

  const completedTrainingsInMonth = useMemo(
    () => trainingsInMonth.filter((t) => t.status === "durchgefuehrt"),
    [trainingsInMonth]
  );

  const abrechnung = useMemo(() => {
    const perSpieler = new Map<
      string,
      {
        name: string;
        sum: number;
        counts: Map<number, number>;
      }
    >();

    completedTrainingsInMonth.forEach((t) => {
      const shareRaw = priceFürSpieler(t);
      const share = round2(shareRaw);

      t.spielerIds.forEach((pid) => {
        const name = spielerById.get(pid)?.name ?? "Unbekannt";
        let entry = perSpieler.get(pid);
        if (!entry) {
          entry = { name, sum: 0, counts: new Map<number, number>() };
          perSpieler.set(pid, entry);
        }
        entry.sum = round2(entry.sum + share);
        entry.counts.set(share, (entry.counts.get(share) ?? 0) + 1);
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

    return { total, spielerRows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTrainingsInMonth, spielerById]);

  function toggleAbrechnungPaid(spielerId: string) {
    setAbrechnungPaid((prev) => {
      const month = abrechnungMonat;
      const current = prev[month] ?? [];
      const isPaid = current.includes(spielerId);
      const nextMonth = isPaid ? current.filter((id) => id !== spielerId) : [...current, spielerId];
      return { ...prev, [month]: nextMonth };
    });
  }

  const paidInMonth = abrechnungPaid[abrechnungMonat] ?? [];

  return (
    <div className="container">
      <div className="header">
        <div className="hTitle">
          <h1>Tennistrainer Planung</h1>
          <p>Ein Trainer, wiederkehrende Termine, Tarife pro Stunde, lokale Speicherung.</p>
        </div>
        <div className="tabs">
          <button className={`tabBtn ${tab === "kalender" ? "tabBtnActive" : ""}`} onClick={() => setTab("kalender")}>
            Kalender
          </button>
          <button className={`tabBtn ${tab === "training" ? "tabBtnActive" : ""}`} onClick={() => setTab("training")}>
            Training
          </button>
          <button
            className={`tabBtn ${tab === "verwaltung" ? "tabBtnActive" : ""}`}
            onClick={() => setTab("verwaltung")}
          >
            Verwaltung
          </button>
          <button
            className={`tabBtn ${tab === "abrechnung" ? "tabBtnActive" : ""}`}
            onClick={() => setTab("abrechnung")}
          >
            Abrechnung
          </button>
        </div>
      </div>

      {tab === "kalender" && (
        <div className="card">
          <div className="split">
            <div className="row">
              <span className="pill">
                Woche ab: <strong>{formatShort(weekStart)}</strong>
              </span>
              <button className="btn btnGhost" onClick={() => setWeekAnchor(addDaysISO(weekStart, -7))}>
                Woche zurück
              </button>
              <button className="btn btnGhost" onClick={() => setWeekAnchor(addDaysISO(weekStart, 7))}>
                Woche vor
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
            <div className="row">
              <div className="field" style={{ minWidth: 220 }}>
                <label>Woche springen</label>
                <input type="date" value={weekAnchor} onChange={(e) => setWeekAnchor(e.target.value)} />
              </div>
              <span className="pill">
                Trainer: <strong>{trainer.name}</strong>
              </span>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="kgrid">
            <div className="kHead">
              <div className="kHeadCell">Zeit</div>
              {weekDays.map((d) => (
                <div key={d} className="kHeadCell">
                  {formatShort(d)}
                </div>
              ))}
            </div>

            <div className="kBody">
              <div className="kTimeCol">
                {hours.map((h) => (
                  <div key={h} className="kTime">
                    {pad2(h)}:00
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayEvents = trainingsInWeek.filter((t) => t.datum === day);
                const startMin = 7 * 60;

                return (
                  <div key={day} className="kDayCol">
                    {hours.map((h) => (
                      <div key={h} className="kHourLine" />
                    ))}

                    {dayEvents.map((t) => {
                      const top = Math.max(0, (toMinutes(t.uhrzeitVon) - startMin) / 60) * 40;
                      const height = Math.max(22, ((toMinutes(t.uhrzeitBis) - toMinutes(t.uhrzeitVon)) / 60) * 40);

                      const ta = tarifById.get(t.tarifId)?.name ?? "Tarif";
                      const sp = t.spielerIds.map((id) => spielerById.get(id)?.name ?? "Spieler").join(", ");

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

                      const showSecondLine = height >= 40;

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
                            filter: isPulse ? "brightness(1.15)" : undefined,
                            transition:
                              "transform 160ms ease, filter 160ms ease, background-color 180ms ease, border-color 180ms ease",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            overflow: "hidden",
                            padding: 8,
                          }}
                          onClick={() => handleCalendarEventClick(t)}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCalendarEventDoubleClick(t);
                          }}
                          title={`Spieler: ${sp}\nZeit: ${t.uhrzeitVon} bis ${t.uhrzeitBis}\nTarif: ${ta}\nStatus: ${statusLabel(
                            t.status
                          )}`}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <strong
                              style={{
                                display: "block",
                                flex: "1 1 auto",
                                overflow: "hidden",
                                wordBreak: "break-word",
                                fontSize: 14,
                                lineHeight: "16px",
                              }}
                              title={sp}
                            >
                              {sp}
                            </strong>
                            {statusBadge(t.status)}
                          </div>

                          {showSecondLine ? (
                            <div
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: 12,
                                lineHeight: "16px",
                              }}
                              title={`${t.uhrzeitVon} bis ${t.uhrzeitBis}, ${ta}`}
                            >
                              {ta}
                            </div>
                          ) : null}
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
            Hinweis: Klick: Bearbeiten, Doppelklick: Abschließen, Status und Farbe ändern sich sofort.
          </div>
        </div>
      )}

      {tab === "training" && (
        <div className="grid2">
          <div className="card">
            <h2>{selectedTrainingId ? "Training bearbeiten" : "Training anlegen"}</h2>

            <div className="row">
              <div className="field">
                <label>Datum</label>
                <input type="date" value={tDatum} onChange={(e) => setTDatum(e.target.value)} />
              </div>
              <div className="field">
                <label>Von</label>
                <input type="time" value={tVon} onChange={(e) => setTVon(e.target.value)} />
              </div>
              <div className="field">
                <label>Bis</label>
                <input type="time" value={tBis} onChange={(e) => setTBis(e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Tarif</label>
                <select value={tTarifId} onChange={(e) => setTTarifId(e.target.value)}>
                  <option value="">Tarif wählen</option>
                  {tarife.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}, {t.preisProStunde} € pro Stunde,{" "}
                      {t.abrechnung === "proSpieler" ? "pro Spieler" : "pro Training"}
                    </option>
                  ))}
                </select>
                <div className="muted">Wenn noch kein Tarif vorhanden ist: Verwaltung, Tarife anlegen.</div>
              </div>

              <div className="field">
                <label>Status</label>
                <select value={tStatus} onChange={(e) => setTStatus(e.target.value as TrainingStatus)}>
                  <option value="geplant">Geplant</option>
                  <option value="durchgefuehrt">Durchgeführt</option>
                  <option value="abgesagt">Abgesagt</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field" style={{ minWidth: 260 }}>
                <label>Notiz</label>
                <input value={tNotiz} onChange={(e) => setTNotiz(e.target.value)} placeholder="optional" />
              </div>
            </div>

            <div style={{ height: 10 }} />

            {!selectedTrainingId && (
              <div className="card cardInset">
                <h2>Wiederholung</h2>
                <div className="row">
                  <label className="pill" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={repeatWeekly}
                      onChange={(e) => setRepeatWeekly(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Wöchentlich wiederholen
                  </label>

                  <div className="field" style={{ minWidth: 220 }}>
                    <label>Bis Datum</label>
                    <input
                      type="date"
                      value={repeatUntil}
                      onChange={(e) => setRepeatUntil(e.target.value)}
                      disabled={!repeatWeekly}
                    />
                  </div>

                  <span className="pill">
                    Trainer: <strong>{trainer.name}</strong>
                  </span>
                </div>

                <div className="muted">Wenn aktiv: Es werden alle Termine wöchentlich bis zum Bis Datum angelegt.</div>
              </div>
            )}

            {selectedTrainingId &&
              (() => {
                const ex = trainings.find((x) => x.id === selectedTrainingId);
                if (!ex?.serieId) return null;
                return (
                  <div className="card cardInset">
                    <h2>Serie bearbeiten</h2>
                    <div className="row">
                      <div className="field">
                        <label>Änderungen anwenden</label>
                        <select value={applySerieScope} onChange={(e) => setApplySerieScope(e.target.value as any)}>
                          <option value="nurDieses">Nur diesen Termin</option>
                          <option value="abHeute">Alle Termine der Serie ab diesem Datum</option>
                        </select>
                      </div>
                      <span className="pill">
                        Serie: <strong>{ex.serieId.slice(0, 8)}</strong>
                      </span>
                    </div>
                    <div className="muted">
                      Bei ab diesem Datum: Uhrzeiten, Spieler, Tarif, Status und Notiz werden für alle zukünftigen Termine
                      übernommen.
                    </div>
                  </div>
                );
              })()}

            <div style={{ height: 10 }} />

            <div className="row">
              <button className="btn" onClick={saveTraining}>
                {selectedTrainingId ? "Änderungen speichern" : "Training speichern"}
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
                <button className="btn btnWarn" onClick={() => deleteTraining(selectedTrainingId)}>
                  Training löschen
                </button>
              )}
              <span className="pill">
                Preis Vorschau: <strong>{euro(preisVorschau)}</strong>
              </span>
            </div>

            <div style={{ height: 14 }} />

            <h2>Schnellzugriff, nächste Trainings</h2>
            <ul className="list">
              {nextTrainings.map((t) => {
                const ta = tarifById.get(t.tarifId)?.name ?? "Tarif";
                const sp = t.spielerIds.map((id) => spielerById.get(id)?.name ?? "Spieler").join(", ");
                return (
                  <li key={t.id} className="listItem">
                    <div>
                      <strong>
                        {t.datum} {t.uhrzeitVon} bis {t.uhrzeitBis}
                      </strong>
                      <div className="muted">
                        {ta}, {sp}
                      </div>
                      {t.serieId ? <div className="muted">Serie: {t.serieId.slice(0, 8)}</div> : null}
                    </div>
                    <div className="smallActions">
                      <button className="btn micro btnGhost" onClick={() => fillTrainingFromSelected(t)}>
                        Bearbeiten
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="muted">Tipp: Im Kalender kannst Du geplante Trainings per Doppelklick direkt abschließen.</div>
          </div>

          <div className="card">
            <h2>Spieler auswählen</h2>
            <div className="row">
              <div className="field">
                <label>Suche</label>
                <input value={spielerSuche} onChange={(e) => setSpielerSuche(e.target.value)} placeholder="Name oder Email" />
              </div>
              <span className="pill">
                Ausgewählt: <strong>{tSpielerIds.length}</strong>
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
                        {s.kontaktTelefon ? `, ${s.kontaktTelefon}` : ""}
                      </div>
                      {s.rechnungsAdresse ? (
                        <div className="muted">Rechnungsadresse: {s.rechnungsAdresse}</div>
                      ) : null}
                    </div>
                    <div className="smallActions">
                      <button className={`btn micro ${checked ? "" : "btnGhost"}`} onClick={() => toggleSpielerPick(s.id)}>
                        {checked ? "Entfernen" : "Hinzufügen"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div style={{ height: 10 }} />
            <div className="muted">
              Pro Training: Gesamtpreis wird auf Spieler verteilt. Pro Spieler: jeder zahlt den vollen Preis.
            </div>
          </div>
        </div>
      )}

      {tab === "verwaltung" && (
        <div className="grid2">
          <div className="card">
            <h2>Trainer bearbeiten</h2>
            <div className="row">
              <div className="field">
                <label>Name</label>
                <input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="z.B. Artur" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={trainerEmail} onChange={(e) => setTrainerEmail(e.target.value)} placeholder="optional" />
              </div>
              <div className="field" style={{ minWidth: 160 }}>
                <label>&nbsp;</label>
                <button
                  className="btn"
                  onClick={() =>
                    setTrainer({
                      name: trainerName.trim() || "Trainer",
                      email: trainerEmail.trim() || undefined,
                    })
                  }
                >
                  Speichern
                </button>
              </div>
            </div>
            <div className="muted">Ein Trainer, ohne Login.</div>
          </div>

          <div className="card">
            <h2>Spieler anlegen</h2>
            <div className="row">
              <div className="field">
                <label>Name</label>
                <input value={spielerName} onChange={(e) => setSpielerName(e.target.value)} placeholder="z.B. Melania" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={spielerEmail} onChange={(e) => setSpielerEmail(e.target.value)} placeholder="optional" />
              </div>
              <div className="field">
                <label>Telefon</label>
                <input value={spielerTelefon} onChange={(e) => setSpielerTelefon(e.target.value)} placeholder="optional" />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Notizen</label>
                <textarea
                  value={spielerNotizen}
                  onChange={(e) => setSpielerNotizen(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="field">
                <label>Rechnungsadresse</label>
                <textarea
                  value={spielerRechnungsAdresse}
                  onChange={(e) => setSpielerRechnungsAdresse(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="field" style={{ minWidth: 160, display: "flex", flexDirection: "column", gap: 6 }}>
                <label>&nbsp;</label>
                <button className="btn" onClick={addSpieler}>
                  {editingSpielerId ? "Änderungen speichern" : "Spieler hinzufügen"}
                </button>
                {editingSpielerId && (
                  <button
                    className="btn btnGhost"
                    onClick={() => {
                      setEditingSpielerId(null);
                      setSpielerName("");
                      setSpielerEmail("");
                      setSpielerTelefon("");
                      setSpielerNotizen("");
                      setSpielerRechnungsAdresse("");
                    }}
                  >
                    Bearbeitung abbrechen
                  </button>
                )}
              </div>
            </div>

            <ul className="list">
              {spieler.map((s) => (
                <li key={s.id} className="listItem">
                  <div>
                    <strong>{s.name}</strong>
                    <div className="muted">
                      {s.kontaktEmail ?? ""}
                      {s.kontaktTelefon ? `, ${s.kontaktTelefon}` : ""}
                    </div>
                    {s.notizen ? <div className="muted">{s.notizen}</div> : null}
                    {s.rechnungsAdresse ? (
                      <div className="muted">Rechnungsadresse: {s.rechnungsAdresse}</div>
                    ) : null}
                  </div>
                  <div className="smallActions">
                    <button
                      className="btn micro"
                      onClick={() => {
                        setEditingSpielerId(s.id);
                        setSpielerName(s.name);
                        setSpielerEmail(s.kontaktEmail ?? "");
                        setSpielerTelefon(s.kontaktTelefon ?? "");
                        setSpielerNotizen(s.notizen ?? "");
                        setSpielerRechnungsAdresse(s.rechnungsAdresse ?? "");
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn micro btnGhost"
                      onClick={() => setSpieler((prev) => prev.filter((x) => x.id !== s.id))}
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Tarife anlegen</h2>
            <div className="row">
              <div className="field">
                <label>Name</label>
                <input value={tarifName} onChange={(e) => setTarifName(e.target.value)} placeholder="z.B. Einzel" />
              </div>
              <div className="field">
                <label>Preis pro Stunde</label>
                <input
                  type="number"
                  value={tarifPreisProStunde}
                  onChange={(e) => setTarifPreisProStunde(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Abrechnung</label>
                <select value={tarifAbrechnung} onChange={(e) => setTarifAbrechnung(e.target.value as any)}>
                  <option value="proTraining">Pro Training</option>
                  <option value="proSpieler">Pro Spieler</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Beschreibung</label>
                <input
                  value={tarifBeschreibung}
                  onChange={(e) => setTarifBeschreibung(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="field" style={{ minWidth: 160, display: "flex", flexDirection: "column", gap: 6 }}>
                <label>&nbsp;</label>
                <button className="btn" onClick={addTarif}>
                  {editingTarifId ? "Änderungen speichern" : "Tarif hinzufügen"}
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
                    Bearbeitung abbrechen
                  </button>
                )}
              </div>
            </div>

            <ul className="list">
              {tarife.map((t) => (
                <li key={t.id} className="listItem">
                  <div>
                    <strong>{t.name}</strong>
                    <div className="muted">
                      {t.preisProStunde} € pro Stunde, {t.abrechnung === "proSpieler" ? "pro Spieler" : "pro Training"}
                    </div>
                    {t.beschreibung ? <div className="muted">{t.beschreibung}</div> : null}
                  </div>
                  <div className="smallActions">
                    <button
                      className="btn micro"
                      onClick={() => {
                        setEditingTarifId(t.id);
                        setTarifName(t.name);
                        setTarifPreisProStunde(t.preisProStunde);
                        setTarifAbrechnung(t.abrechnung);
                        setTarifBeschreibung(t.beschreibung ?? "");
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn micro btnGhost"
                      onClick={() => setTarife((prev) => prev.filter((x) => x.id !== t.id))}
                    >
                      Löschen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Daten</h2>
            <div className="row">
              <span className="pill">
                Spieler: <strong>{spieler.length}</strong>
              </span>
              <span className="pill">
                Tarife: <strong>{tarife.length}</strong>
              </span>
              <span className="pill">
                Trainings: <strong>{trainings.length}</strong>
              </span>
            </div>

            <div style={{ height: 10 }} />

            <div className="row">
              <button
                className="btn btnWarn"
                onClick={() => {
                  const ok = window.confirm("Wirklich alle Daten löschen?");
                  if (!ok) return;
                  setSpieler([]);
                  setTarife([]);
                  setTrainings([]);
                  setAbrechnungPaid({});
                  setTrainer({ name: "Trainer", email: "" });
                  setTrainerName("Trainer");
                  setTrainerEmail("");
                  localStorage.removeItem(STORAGE_KEY);
                }}
              >
                Alles löschen
              </button>
            </div>

            <div style={{ height: 10 }} />
            <div className="muted">Speicherung ist lokal im Browser.</div>
          </div>
        </div>
      )}

      {tab === "abrechnung" && (
        <div className="card">
          <div className="split">
            <div>
              <h2>Abrechnung</h2>
              <div className="muted">Es werden nur durchgeführte Trainings angezeigt und berechnet.</div>
            </div>
            <div className="row">
              <div className="field" style={{ minWidth: 220 }}>
                <label>Monat</label>
                <input type="month" value={abrechnungMonat} onChange={(e) => setAbrechnungMonat(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className="row">
            <span className="pill">
              Trainer: <strong>{trainer.name}</strong>
            </span>
            <span className="pill">
              Umsatz gesamt: <strong>{euro(abrechnung.total)}</strong>
            </span>
            <span className="pill">
              Trainings: <strong>{completedTrainingsInMonth.length}</strong>
            </span>
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
                </tr>
              </thead>
              <tbody>
                {abrechnung.spielerRows.map((r) => {
                  const breakdownText =
                    r.breakdown.length === 0
                      ? "-"
                      : r.breakdown
                          .map((b) => `${b.count} × ${euro(b.amount)}`)
                          .join(" + ");

                  const isPaid = paidInMonth.includes(r.id);

                  return (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{breakdownText}</td>
                      <td>{euro(r.sum)}</td>
                      <td>
                        <button
                          className={`btn micro ${isPaid ? "btnGhost" : ""}`}
                          onClick={() => toggleAbrechnungPaid(r.id)}
                        >
                          {isPaid ? "Bezahlt" : "Offen"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ height: 14 }} />

          <h2>Trainings im Monat</h2>
          <ul className="list">
            {completedTrainingsInMonth.map((t) => {
              const ta = tarifById.get(t.tarifId)?.name ?? "Tarif";
              const sp = t.spielerIds.map((id) => spielerById.get(id)?.name ?? "Spieler").join(", ");
              const price = euro(round2(trainingPreisGesamt(t)));

              return (
                <li key={t.id} className="listItem">
                  <div>
                    <strong>
                      {t.datum} {t.uhrzeitVon} bis {t.uhrzeitBis}
                    </strong>
                    <div className="muted">
                      {sp}, {ta}, {trainer.name}
                    </div>
                    {t.notiz ? <div className="muted">{t.notiz}</div> : null}
                    {t.serieId ? <div className="muted">Serie: {t.serieId.slice(0, 8)}</div> : null}
                  </div>
                  <div className="smallActions">
                    <span className="badge badgeOk">durchgeführt</span>
                    <span className="badge">{price}</span>
                    <button className="btn micro btnGhost" onClick={() => fillTrainingFromSelected(t)}>
                      Bearbeiten
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
