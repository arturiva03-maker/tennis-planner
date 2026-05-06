/* eslint-disable */
// Matched die SEPA-Mandate (aus dem Formular) gegen die Spielerliste
// und merged sie mit dem contactBook_matched.csv. Mandate haben Vorrang.

const fs = require("fs");
const path = require("path");

// Spieler-Liste aus match-contactbook.js wiederverwenden
const SPIELER = require("./_spieler-list.js");

// ---- SEPA-Mandate aus Supabase ----
const MANDATES = [
  {v:"Damla",n:"Akbaş",iban:"DE67100110012623215392",strasse:"Gleimstrasse 43, 1.OG Mitte",plz:"10437",ort:"Berlin",mandat:"SEPA-20260430-RIXA6O",datum:"2026-04-30",istKind:false,parent:null},
  {v:"Ercin",n:"Akcali",iban:"DE57100100100174486133",strasse:"Tauroggener Str. 35",plz:"10589",ort:"Berlin",mandat:"SEPA-20260422-IPR340",datum:"2026-04-22",istKind:false,parent:null},
  {v:"Jannis",n:"Arnold",iban:"DE35100110012627418881",strasse:"Urbanstr. 49",plz:"10967",ort:"Berlin",mandat:"SEPA-20260414-B0CQYQ",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Leska",n:"Bartmann",iban:"DE30200411330102987500",strasse:"Havermannstr. 6",plz:"12359",ort:"Berlin",mandat:"SEPA-20260417-P1BACQ",datum:"2026-04-17",istKind:false,parent:null},
  {v:"Marc",n:"Bernath",iban:"DE63200411330330558800",strasse:"Schönfließer Straße 18",plz:"10439",ort:"Berlin",mandat:"SEPA-20260423-0P6OFZ",datum:"2026-04-23",istKind:false,parent:null},
  {v:"Sören",n:"Biermann",iban:"DE37430609673219389800",strasse:"Müllerstr. 31",plz:"13353",ort:"Berlin",mandat:"SEPA-20260430-IT0K2L",datum:"2026-04-30",istKind:false,parent:null},
  {v:"Nina",n:"Böing",iban:"DE57500105175446480978",strasse:"Reuterstraße 92",plz:"12053",ort:"Berlin",mandat:"SEPA-20260407-XF587N",datum:"2026-04-07",istKind:false,parent:null},
  {v:"Noah",n:"Dick",iban:"DE11200411550899132500",strasse:"Cornelius-Fredericks-Straße 14",plz:"13351",ort:"Berlin",mandat:"SEPA-20260402-MPOWKG",datum:"2026-04-02",istKind:true,parent:"Annette Dick"},
  {v:"Beyza",n:"Ermis",iban:"BE24967359731738",strasse:"14B, Fehrbelliner Strasse 14B",plz:"10119",ort:"Berlin",mandat:"SEPA-20260428-VVWYZT",datum:"2026-04-28",istKind:false,parent:null},
  {v:"Nicolas",n:"Fischer",iban:"DE38120300001050497518",strasse:"Flughafenstraße 7",plz:"12053",ort:"Berlin",mandat:"SEPA-20260414-EK4M03",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Alessandro",n:"Franco",iban:"DE46100110012623410449",strasse:"Helmstr. 8",plz:"10827",ort:"Berlin",mandat:"SEPA-20260427-04JHDR",datum:"2026-04-27",istKind:false,parent:null},
  {v:"Jona",n:"Gentzsch",iban:"DE24100400000929087500",strasse:"Schönhauser Allee 130",plz:"10437",ort:"Berlin",mandat:"SEPA-20260423-6WJB76",datum:"2026-04-23",istKind:false,parent:null},
  {v:"Luisa",n:"Gontarski",iban:"DE81760260000489145300",strasse:"Gielower Str 11",plz:"12359",ort:"Berlin",mandat:"SEPA-20260415-ETU32R",datum:"2026-04-15",istKind:true,parent:"Bernd Posner"},
  {v:"Martin",n:"Hejma",iban:"DE37300700240782895700",strasse:"Wiclefstr. 1",plz:"10551",ort:"Berlin",mandat:"SEPA-20260429-760MU4",datum:"2026-04-29",istKind:false,parent:null},
  {v:"Christopher",n:"Heyer",iban:"DE30200411550286061700",strasse:"Eschersheimer Str. 41",plz:"12099",ort:"Berlin",mandat:"SEPA-20260413-LRDQBL",datum:"2026-04-13",istKind:false,parent:null},
  {v:"Jonathan",n:"Hübner",iban:"DE82100500001065859119",strasse:"Windhuker Str. 60D",plz:"13351",ort:"Berlin",mandat:"SEPA-20260423-IVOVWX",datum:"2026-04-23",istKind:false,parent:null},
  {v:"Romy",n:"Hufsky",iban:"DE81500105175424586870",strasse:"Reginhardstr. 8",plz:"13409",ort:"Berlin",mandat:"SEPA-20260401-RBKSRL",datum:"2026-04-01",istKind:false,parent:null},
  {v:"Pelle",n:"John",iban:"DE21120300001082749936",strasse:"Mariendorfer Weg 30",plz:"12051",ort:"Berlin",mandat:"SEPA-20260330-10LJH1",datum:"2026-03-30",istKind:false,parent:null},
  {v:"Philip",n:"Jokic",iban:"DE48120300001050739935",strasse:"Belziger Straße 31",plz:"10823",ort:"Berlin",mandat:"SEPA-20260418-D6V5HA",datum:"2026-04-18",istKind:false,parent:null},
  {v:"Tobias",n:"Jung",iban:"DE63120300001057679530",strasse:"Czarnikauer Straße 11",plz:"10439",ort:"Berlin",mandat:"SEPA-20260412-UVM4PK",datum:"2026-04-12",istKind:false,parent:null},
  {v:"Peter-Michael",n:"Keßler",iban:"DE66100400000678530700",strasse:"Warthestraße 65",plz:"12051",ort:"Berlin",mandat:"SEPA-20260414-6DL10L",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Patrick",n:"Kilborn",iban:"DE08300209000906782315",strasse:"Karl kunger Straße 55",plz:"12435",ort:"Berlin",mandat:"SEPA-20260422-1K0H0N",datum:"2026-04-22",istKind:false,parent:null},
  {v:"Christina",n:"Klasen",iban:"DE98120300001075258598",strasse:"Anklamer Straße 50",plz:"10115",ort:"Berlin",mandat:"SEPA-20260329-6LZI7T",datum:"2026-03-29",istKind:false,parent:null},
  {v:"Johanna",n:"Kleinert",iban:"DE95500105175459351903",strasse:"Weserstraße 131",plz:"12059",ort:"Berlin",mandat:"SEPA-20260408-VJR0TW",datum:"2026-04-08",istKind:false,parent:null},
  {v:"Isabella",n:"Kleinschmitt",iban:"DE86760300800240759829",strasse:"Chausseestraße, 88a",plz:"10115",ort:"Berlin",mandat:"SEPA-20260410-ULB3HC",datum:"2026-04-10",istKind:false,parent:null},
  {v:"Lucas",n:"Köhler",iban:"DE44400501500134553593",strasse:"Mittenwalder Straße 53",plz:"10961",ort:"Berlin",mandat:"SEPA-20260327-JXB3SP",datum:"2026-03-27",istKind:false,parent:null},
  {v:"Maximilian",n:"Kricke",iban:"DE29120300001082859305",strasse:"Monumentenstraße 5",plz:"10829",ort:"Berlin",mandat:"SEPA-20260414-QAJYIR",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Ansgar",n:"Little",iban:"DE43370605900003076911",strasse:"Adalbertstraße 84",plz:"10997",ort:"Berlin",mandat:"SEPA-20260413-3EKPN4",datum:"2026-04-13",istKind:false,parent:null},
  {v:"Sebastian",n:"Maaß",iban:"DE87100800000176814100",strasse:"Kulmbacher Straße 6",plz:"10777",ort:"Berlin",mandat:"SEPA-20260330-7DZTH2",datum:"2026-03-30",istKind:false,parent:null},
  {v:"Silvia",n:"Mayr",iban:"DE35120300001036640637",strasse:"Jonasstr. 30",plz:"12053",ort:"Berlin",mandat:"SEPA-20260407-O3EWAO",datum:"2026-04-07",istKind:false,parent:null},
  {v:"Mauro",n:"Paradela del Rio",iban:"DE40120300001083848604",strasse:"Warthestrasse 24",plz:"12051",ort:"Berlin",mandat:"SEPA-20260417-TVN3PH",datum:"2026-04-16",istKind:false,parent:null},
  {v:"Vincent",n:"Posner",iban:"DE45100100100138435135",strasse:"Am Straßenbahnhof 50A",plz:"12347",ort:"Berlin",mandat:"SEPA-20260414-VZNWUP",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Elisa",n:"Puls",iban:"DE88200411330898061700",strasse:"Bergfriedstr 10",plz:"10696",ort:"Berlin",mandat:"SEPA-20260401-WSSNQY",datum:"2026-04-01",istKind:false,parent:null},
  {v:"Linda",n:"Pyko",iban:"DE97120300001038071435",strasse:"Stromstraße 37",plz:"10551",ort:"Berlin",mandat:"SEPA-20260426-1XGJB0",datum:"2026-04-26",istKind:false,parent:null},
  {v:"Andrin",n:"Reinhart",iban:"DE61430609671144787900",strasse:"Tile-Wardenberg-Str. 13",plz:"10555",ort:"Berlin",mandat:"SEPA-20260429-CFR0XM",datum:"2026-04-29",istKind:true,parent:"Martin Reinhart"},
  {v:"Magdalena",n:"Rotko",iban:"DE58100110012622297546",strasse:"Blumenthalstr 21",plz:"12103",ort:"Berlin",mandat:"SEPA-20260414-R7WQ9O",datum:"2026-04-14",istKind:false,parent:null},
  {v:"Javed",n:"Saleem",iban:"DE95500105175424232083",strasse:"Reuterstraße 92",plz:"12053",ort:"Berlin",mandat:"SEPA-20260407-JW778M",datum:"2026-04-07",istKind:false,parent:null},
  {v:"Bethany",n:"Schmidt",iban:"BE61967887817017",strasse:"Bundesplatz 17",plz:"10715",ort:"Berlin",mandat:"SEPA-20260412-FT3XW4",datum:"2026-04-12",istKind:false,parent:null},
  {v:"Anja",n:"Siegel",iban:"DE86200411550300849700",strasse:"Bochumer Str. 5.3",plz:"10555",ort:"Berlin",mandat:"SEPA-20260328-KOR4W5",datum:"2026-03-28",istKind:false,parent:null},
  {v:"Oliver",n:"Simpson",iban:"DE88120300001310405111",strasse:"Glasower Str. 56",plz:"12051",ort:"Berlin",mandat:"SEPA-20260402-KGS1Y6",datum:"2026-04-02",istKind:false,parent:null},
  {v:"Tom",n:"Spenkuch",iban:"DE42765600600004082672",strasse:"Walterstraße 28",plz:"12051",ort:"Berlin",mandat:"SEPA-20260413-UHAWIN",datum:"2026-04-13",istKind:false,parent:null},
  {v:"Michael",n:"Städler",iban:"DE04120300001012303119",strasse:"Niemetzstr 24",plz:"12055",ort:"Berlin",mandat:"SEPA-20260409-W8SRUN",datum:"2026-04-09",istKind:false,parent:null},
  {v:"Iosif",n:"Stavarache",iban:"DE6810012153918995",strasse:"Altenbraker Straße, 32",plz:"12051",ort:"Berlin",mandat:"SEPA-20260401-3DGDRJ",datum:"2026-04-01",istKind:false,parent:null},
  {v:"Maria-Alexandra",n:"Steinbeck",iban:"DE40100700240106444300",strasse:"Spandauer Damm 64",plz:"14059",ort:"Berlin",mandat:"SEPA-20251226-XGSQCH",datum:"2025-12-26",istKind:true,parent:"Leila Saidalijeva"},
  {v:"Jördis",n:"Strahlendorff",iban:"DE66500105175435814405",strasse:"Rixdorfer Str. 93",plz:"12109",ort:"Berlin",mandat:"SEPA-20260403-AIEQ3O",datum:"2026-04-03",istKind:false,parent:null},
  {v:"Marvin",n:"Stutz",iban:"DE44661900000000270431",strasse:"Treptowerstr 94A",plz:"12059",ort:"Berlin",mandat:"SEPA-20260412-YZALH8",datum:"2026-04-12",istKind:false,parent:null},
  {v:"Slim",n:"Tabka",iban:"DE46100110012621657950",strasse:"Steegerstr 60",plz:"13359",ort:"Berlin",mandat:"SEPA-20260213-QAZYGO",datum:"2026-02-13",istKind:true,parent:"Adam Tabka"},
  {v:"Lena",n:"von Stebut",iban:"DE80100110012649353748",strasse:"Karl-Marx-Straße 142a",plz:"12043",ort:"Berlin",mandat:"SEPA-20260416-SWO1RX",datum:"2026-04-16",istKind:false,parent:null},
  {v:"Magdalena",n:"Vondung",iban:"DE28250100300974005305",strasse:"Mareschstraße 4, SF",plz:"12055",ort:"Berlin",mandat:"SEPA-20260327-81KCDH",datum:"2026-03-27",istKind:false,parent:null},
  {v:"Simon",n:"Weyer",iban:"DE08120300001050145075",strasse:"Reichenberger Str. 136",plz:"10999",ort:"Berlin",mandat:"SEPA-20260416-8BOOUL",datum:"2026-04-16",istKind:false,parent:null},
];

// Manuelle Zuordnungen (Eltern → Spieler-IDs), wenn Vor/Nach nicht direkt matched
// null = ignorieren (egal)
const MANUAL_MANDATE = {
  "ercin akcali":   { ids: ["c1f81670-d72a-4193-b3b6-516fc67e7ae6"] }, // → Marcel Akcali
  "martin hejma":   { ids: ["2a37b7df-56a7-4758-b114-9acc2ded21ef"] }, // → Clara Güttler-Hejma
  "sebastian maaß": { ids: ["1c939f06-116b-4e7e-b615-4ab118b379f7"] }, // → Antonia Maaß
  "pelle john":     { ids: ["9a848b95-8460-4949-a8d7-163cd6601cee"] }, // → Pelle Svante John
  "peter-michael keßler": { ids: ["9e32c15b-aca4-4085-921c-91dcffa0573a"] }, // → Peter Keßler
  "slim tabka":     { ids: ["5c8ec220-20a2-4d38-85e9-4fdfeeead1bf"] }, // → Adam Tabka (Eltern-Kind invertiert im Formular)
  "damla akbaş":    { ids: ["2dc76a17-b082-4580-bb78-1be19dcdc172"] }, // ß-Variante
  "mauro paradela del rio": { ids: ["08f8cbf8-bd9e-42fb-acc8-ce72414050f5"] }, // Name-Split anders in Spielerliste
  "marc bernath":    { ids: ["6af9c7c0-b72d-4ec3-bd02-ba9af861b232"] }, // → Alma von Anhalt
  "jonathan hübner": { ids: ["4728834b-8efb-4c4b-b79a-f286b0172f1b"] }, // → Sophie Misiak
  "linda pyko":      null, // user: egal
  "beyza ermis":     null, // user: egal
};

// Neue Spieler die noch nicht in der Spielerliste sind, aber ins Bulk-File sollen
// (ihr eigener Name wird verwendet, kein Spieler-Mapping)
const NEW_SPIELER = new Set([
  "lucas köhler",
  "simon weyer",
]);

function lc(s){return (s||"").toLowerCase().normalize("NFC").replace(/\s+/g," ").trim();}
function spielerByName(v,n){
  const tv=lc(v), tn=lc(n);
  return SPIELER.find(s => lc(s.v)===tv && lc(s.n)===tn);
}
function spielerByLastName(n){
  const tn=lc(n);
  return SPIELER.filter(s => lc(s.n)===tn);
}

const matched = [];
const unmatched = [];

for (const m of MANDATES) {
  const lcname = lc(`${m.v} ${m.n}`);
  let targets = [];
  let reason = "";

  if (lcname in MANUAL_MANDATE) {
    if (MANUAL_MANDATE[lcname] === null) {
      unmatched.push({mandateName:`${m.v} ${m.n}`, iban:m.iban, mandat:m.mandat, datum:m.datum, reason:"manuell ignoriert"});
      continue;
    }
    targets = MANUAL_MANDATE[lcname].ids.map(id => SPIELER.find(s=>s.id===id)).filter(Boolean);
    reason = "manuell zugeordnet";
  }
  if (!targets.length && NEW_SPIELER.has(lcname)) {
    matched.push({
      spielerId: null,
      spielerName: `${m.v} ${m.n}`,
      mandateName: `${m.v} ${m.n}`,
      iban: m.iban, strasse: m.strasse, plz: m.plz, ort: m.ort,
      mandat: m.mandat, datum: m.datum,
      istKind: m.istKind, parent: m.parent,
      reason: "neuer spieler",
    });
    continue;
  }
  if (!targets.length) {
    const t = spielerByName(m.v, m.n);
    if (t) { targets=[t]; reason="exakt"; }
  }
  if (!targets.length) {
    const cands = spielerByLastName(m.n);
    if (cands.length === 1) { targets=[cands[0]]; reason="nachname-eindeutig"; }
  }

  if (targets.length) {
    for (const t of targets) {
      matched.push({
        spielerId: t.id,
        spielerName: `${t.v} ${t.n}`,
        mandateName: `${m.v} ${m.n}`,
        iban: m.iban,
        strasse: m.strasse,
        plz: m.plz,
        ort: m.ort,
        mandat: m.mandat,
        datum: m.datum,
        istKind: m.istKind,
        parent: m.parent,
        reason,
      });
    }
  } else {
    unmatched.push({mandateName:`${m.v} ${m.n}`, iban:m.iban, mandat:m.mandat, datum:m.datum, reason:"kein Match"});
  }
}

console.log(`\n=== MANDATE MATCHED (${matched.length}) ===`);
for (const m of matched) {
  console.log(`✓ ${m.mandateName.padEnd(34)} → ${m.spielerName.padEnd(34)} [${m.reason}]`);
}

console.log(`\n=== MANDATE UNMATCHED (${unmatched.length}) ===`);
for (const u of unmatched) {
  console.log(`✗ ${u.mandateName.padEnd(34)} [${u.reason}] (${u.mandat})`);
}

// ---- contactBook_matched.csv lesen ----
const cbPath = path.resolve(__dirname,"..","..","Desktop","contactBook_matched.csv");
const cbText = fs.readFileSync(cbPath,"utf-8");
const cbLines = cbText.split(/\r?\n/).filter(l=>l.trim());
const cbHeader = cbLines[0];
const cbRows = cbLines.slice(1).map(l => l.split(";"));

// Mandate-Spieler-IDs (für Dedup)
const mandateSpielerIds = new Set(matched.map(m=>m.spielerId));

// ---- Merge: Mandate zuerst, dann ContactBook für Spieler die noch nicht da sind ----
const out = [cbHeader];

// Mandate-Zeilen (Format wie contactBook_matched.csv)
for (const m of matched) {
  const verw = "Abbuchung Tennistraining (Monat), Rechnung nur auf Anfrage";
  const adresse = [m.strasse, `${m.plz} ${m.ort}`].filter(Boolean).join(", ");
  let zusatz = "";
  if (m.istKind && m.parent) zusatz = `Rechnungsempfänger: ${m.parent}`;
  else if (m.mandateName !== m.spielerName) zusatz = `Rechnungsempfänger: ${m.mandateName}`;
  out.push([m.spielerName, m.iban, "", adresse, "DE58ZZZ00002765947", verw, m.mandat, m.datum, zusatz, ""].join(";"));
}

// ContactBook-Zeilen (nur wenn nicht schon durch Mandat abgedeckt)
let cbAdded = 0, cbSkipped = 0;
for (const cols of cbRows) {
  const spielerName = cols[0];
  // Spieler-ID aus dem ContactBook-Eintrag finden
  const sp = SPIELER.find(s => `${s.v} ${s.n}` === spielerName);
  if (sp && mandateSpielerIds.has(sp.id)) {
    cbSkipped++;
    continue;
  }
  out.push(cols.join(";"));
  cbAdded++;
}

const merged = out.join("\n") + "\n";
const mergedPath = path.resolve(__dirname,"..","..","Desktop","sepa_bulk_merged.csv");
fs.writeFileSync(mergedPath, merged, "utf-8");

console.log(`\n=== MERGE ===`);
console.log(`  ${matched.length} Zeilen aus SEPA-Mandaten`);
console.log(`  ${cbAdded} Zeilen aus contactBook (${cbSkipped} übersprungen, da bereits Mandat vorhanden)`);
console.log(`  ${matched.length + cbAdded} Zeilen GESAMT`);
console.log(`\n→ neue CSV: ${mergedPath}`);
