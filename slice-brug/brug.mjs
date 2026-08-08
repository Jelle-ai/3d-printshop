#!/usr/bin/env node
/* =====================================================================
   LayerCraft slice-brug
   Draait op de werkplaats-PC en verbindt de webshop met Bambu Studio.

   Wat het doet, telkens opnieuw:
     1. luisteren of er een nieuwe opdracht in de shop staat
     2. het bestand van de klant ophalen (byte voor byte, met controle)
     3. Bambu Studio het model laten slicen, met de instellingen die de
        klant gekozen heeft
     4. de werkelijke printtijd en het werkelijke gewicht terugschrijven

   De shop rekent daarna af op die echte cijfers in plaats van op een
   schatting. Bambu Studio zelf wordt niet geïnstalleerd of aangepast —
   we gebruiken het programma dat al op deze PC staat.

   Starten:  node brug.mjs
   Testen:   node brug.mjs --test mijnmodel.stl
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir, homedir } from "node:os";
import { execFile } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";

/* Firebase halen we pas op wanneer we echt verbinding maken. Zo werkt
   `node brug.mjs --test` ook voordat npm install gedraaid heeft, en zegt een
   ontbrekend pakket niets over of Bambu Studio goed staat. */
let initializeApp, getAuth, signInWithEmailAndPassword,
    getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where;
async function laadFirebase(){
  if (initializeApp) return;
  let app, auth, store;
  try{
    [app, auth, store] = await Promise.all([
      import("firebase/app"), import("firebase/auth"), import("firebase/firestore"),
    ]);
  }catch(e){
    throw new Error("De Firebase-onderdelen ontbreken. Draai eerst in deze map: npm install");
  }
  ({ initializeApp } = app);
  ({ getAuth, signInWithEmailAndPassword } = auth);
  ({ getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where } = store);
}

const HIER = dirname(fileURLToPath(import.meta.url));

/* Dezelfde shop als de website. Deze gegevens staan ook gewoon in index.html:
   ze zijn openbaar, de echte grens ligt bij de Firestore-regels. */
const FIREBASE = {
  apiKey: "AIzaSyC_CqcZToYO1GMGZ75ThjPi4GBGyNB6Wm0",
  authDomain: "d-printing-shop-fbc7b.firebaseapp.com",
  projectId: "d-printing-shop-fbc7b",
  storageBucket: "d-printing-shop-fbc7b.firebasestorage.app",
  messagingSenderId: "486587768275",
  appId: "1:486587768275:web:5b66b46370d3cc227b2326",
};

/* --------------------------- instellingen --------------------------- */

const STANDAARD = {
  email: "",
  wachtwoord: "",
  bambuPad: "",             // leeg = zelf zoeken
  profielMap: "",           // leeg = zelf zoeken
  printer: "Bambu Lab X1 Carbon 0.4 nozzle",
  filamentPerType: {
    "PLA Basic": "Bambu PLA Basic",
    "PLA Matte": "Bambu PLA Matte",
    "PLA Silk+": "Bambu PLA Silk",
    "PETG HF":   "Bambu PETG HF",
    "ABS":       "Bambu ABS",
  },
  procesPerLaaghoogte: {
    "0.12mm": "0.12mm Fine",
    "0.16mm": "0.16mm Optimal",
    "0.20mm": "0.20mm Standard",
    "0.28mm": "0.28mm Extra Draft",
  },
  vullingDoorgeven: true,   // --sparse-infill-density meegeven aan de slicer
  tijdslimietSec: 900,      // hoe lang Bambu Studio over één model mag doen
  logMap: "logs",
};

function laadInstellingen(){
  const pad = join(HIER, "instellingen.json");
  if (!existsSync(pad)){
    console.error(
      "\nEr staat nog geen instellingen.json.\n" +
      "Kopieer instellingen.voorbeeld.json naar instellingen.json en vul je\n" +
      "e-mailadres en wachtwoord van de shop in.\n");
    process.exit(1);
  }
  let eigen;
  try { eigen = JSON.parse(readFileSync(pad, "utf8")); }
  catch (e){ console.error("instellingen.json is geen geldige JSON: " + e.message); process.exit(1); }
  const cfg = { ...STANDAARD, ...eigen };
  cfg.filamentPerType = { ...STANDAARD.filamentPerType, ...(eigen.filamentPerType || {}) };
  cfg.procesPerLaaghoogte = { ...STANDAARD.procesPerLaaghoogte, ...(eigen.procesPerLaaghoogte || {}) };
  return cfg;
}

/* --------------------------- Bambu Studio vinden --------------------------- */

const KANDIDATEN = {
  win32: [
    "C:\\Program Files\\Bambu Studio\\bambu-studio.exe",
    "C:\\Program Files (x86)\\Bambu Studio\\bambu-studio.exe",
    join(homedir(), "AppData\\Local\\Programs\\Bambu Studio\\bambu-studio.exe"),
  ],
  darwin: [
    "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio",
    join(homedir(), "Applications/BambuStudio.app/Contents/MacOS/BambuStudio"),
  ],
  linux: [
    "/usr/bin/bambu-studio",
    "/usr/local/bin/bambu-studio",
    "/opt/bambu-studio/bambu-studio",
  ],
};

function zoekBambu(cfg){
  if (cfg.bambuPad){
    if (!existsSync(cfg.bambuPad)) throw new Error(`bambuPad wijst naar iets dat niet bestaat: ${cfg.bambuPad}`);
    return cfg.bambuPad;
  }
  for (const p of (KANDIDATEN[process.platform] || [])) if (existsSync(p)) return p;
  // Op Linux staat het vaak als AppImage in de Downloads of thuismap.
  if (process.platform === "linux"){
    for (const map of [homedir(), join(homedir(), "Downloads"), join(homedir(), "Applications")]){
      if (!existsSync(map)) continue;
      const hit = readdirSync(map).find(f => /bambu.*studio.*\.appimage$/i.test(f));
      if (hit) return join(map, hit);
    }
  }
  throw new Error(
    "Bambu Studio niet gevonden. Vul het volledige pad naar het programma in bij\n" +
    '  "bambuPad" in instellingen.json.');
}

function zoekProfielMap(cfg, bambu){
  if (cfg.profielMap){
    if (!existsSync(cfg.profielMap)) throw new Error(`profielMap bestaat niet: ${cfg.profielMap}`);
    return cfg.profielMap;
  }
  const kandidaten = process.platform === "darwin"
    ? [join(bambu, "../../Resources/profiles/BBL")]
    : [join(dirname(bambu), "resources", "profiles", "BBL")];
  for (const p of kandidaten) if (existsSync(p)) return p;
  throw new Error(
    "De profielenmap van Bambu Studio is niet gevonden. Dat is de map met\n" +
    "machine/, process/ en filament/ erin. Vul hem in bij \"profielMap\".");
}

/* Zoekt het profielbestand dat het dichtst bij de gevraagde naam ligt.
   Zo blijft het werken als Bambu de bestandsnamen een beetje wijzigt. */
function zoekProfiel(map, submap, naam){
  const dir = join(map, submap);
  if (!existsSync(dir)) throw new Error(`profielmap ontbreekt: ${dir}`);
  const bestanden = readdirSync(dir).filter(f => f.toLowerCase().endsWith(".json"));
  const plat = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const doel = plat(naam);
  const exact = bestanden.find(f => plat(basename(f, ".json")) === doel);
  if (exact) return join(dir, exact);
  const begint = bestanden.filter(f => plat(basename(f, ".json")).startsWith(doel));
  if (begint.length) return join(dir, begint.sort((a,b) => a.length - b.length)[0]);
  const bevat = bestanden.filter(f => plat(basename(f, ".json")).includes(doel));
  if (bevat.length) return join(dir, bevat.sort((a,b) => a.length - b.length)[0]);
  throw new Error(
    `Geen profiel gevonden voor "${naam}" in ${dir}.\n` +
    `Wat er wel staat: ${bestanden.slice(0, 8).map(f => basename(f, ".json")).join(", ")}${bestanden.length > 8 ? ", …" : ""}`);
}

/* --------------------------- zip lezen --------------------------- */
/* Een 3mf is een zip. We hebben er maar één bestandje uit nodig, dus lezen we
   de inhoudsopgave achteraan en pakken alleen dat uit. */
function unzip(buf){
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--){
    if (buf.readUInt32LE(i) === 0x06054b50){ eocd = i; break; }
  }
  if (eocd < 0) throw new Error("geen geldig zip-bestand");
  const aantal = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const uit = new Map();
  for (let i = 0; i < aantal; i++){
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const methode = buf.readUInt16LE(p + 10);
    const compLen = buf.readUInt32LE(p + 20);
    const naamLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen = buf.readUInt16LE(p + 32);
    const start = buf.readUInt32LE(p + 42);
    const naam = buf.toString("utf8", p + 46, p + 46 + naamLen);
    const lokaalNaam = buf.readUInt16LE(start + 26);
    const lokaalExtra = buf.readUInt16LE(start + 28);
    const data = buf.subarray(start + 30 + lokaalNaam + lokaalExtra,
                              start + 30 + lokaalNaam + lokaalExtra + compLen);
    uit.set(naam, methode === 0 ? Buffer.from(data) : inflateRawSync(data));
    p += 46 + naamLen + extraLen + commLen;
  }
  return uit;
}

/* --------------------------- uitkomst uitlezen --------------------------- */
/* Bambu Studio schrijft in het gesnedeen 3mf een bestandje slice_info.config
   met per plaat de voorspelde tijd (seconden) en het gewicht (gram). Dat zijn
   exact de cijfers die je in het programma zelf ziet staan. */
function leesSliceInfo(buf){
  const inhoud = unzip(buf);
  const info = inhoud.get("Metadata/slice_info.config");
  if (info){
    const xml = info.toString("utf8");
    const platen = xml.split(/<plate[\s>]/i).slice(1);
    let seconden = 0, gram = 0, gevonden = false;
    for (const plaat of platen){
      const tijd = plaat.match(/key="prediction"\s+value="([\d.]+)"/i);
      const gewicht = plaat.match(/key="weight"\s+value="([\d.]+)"/i);
      if (tijd){ seconden += parseFloat(tijd[1]); gevonden = true; }
      if (gewicht){ gram += parseFloat(gewicht[1]); gevonden = true; }
    }
    if (gevonden && seconden > 0) return { seconden: Math.round(seconden), gram: +gram.toFixed(2), bron: "slice_info" };
  }
  // Terugval: de cijfers staan ook als commentaar bovenaan de G-code zelf.
  for (const [naam, data] of inhoud){
    if (!/\.gcode$/i.test(naam)) continue;
    const kop = data.subarray(0, 200000).toString("utf8");
    const g = kop.match(/total filament used \[g\]\s*=\s*([\d.]+)/i);
    const t = kop.match(/estimated printing time.*?=\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
    if (g && t){
      const sec = (+(t[1]||0))*86400 + (+(t[2]||0))*3600 + (+(t[3]||0))*60 + (+(t[4]||0));
      if (sec > 0) return { seconden: sec, gram: +parseFloat(g[1]).toFixed(2), bron: "gcode" };
    }
  }
  throw new Error("Bambu Studio gaf geen tijd en gewicht terug in het resultaat");
}

/* --------------------------- slicen --------------------------- */

const EENHEID = { mm: 1, cm: 10, inch: 25.4 };

function draai(exe, args, tijdslimietSec){
  return new Promise((klaar) => {
    execFile(exe, args, { timeout: tijdslimietSec * 1000, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => klaar({ err, stdout: String(stdout || ""), stderr: String(stderr || "") }));
  });
}

/* Haalt één model door Bambu Studio en geeft de echte cijfers terug. */
async function slice(omg, modelPad, opties){
  const { cfg, bambu, profielen } = omg;
  const machine = zoekProfiel(profielen, "machine", cfg.printer);
  const proces = zoekProfiel(profielen, "process",
    (cfg.procesPerLaaghoogte[opties.laaghoogte] || "0.20mm Standard") + " @BBL X1C");
  const filament = zoekProfiel(profielen, "filament",
    (cfg.filamentPerType[opties.filamentType] || "Bambu PLA Basic") + " @BBL X1C");

  const werkmap = mkdtempSync(join(tmpdir(), "layercraft-"));
  const uit = join(werkmap, "resultaat.gcode.3mf");
  const schaal = (EENHEID[opties.eenheid] || 1) * ((opties.schaalPct || 100) / 100);

  const basis = [
    "--load-settings", `${machine};${proces}`,
    "--load-filaments", filament,
    "--orient", "1",
    "--arrange", "1",
  ];
  if (Math.abs(schaal - 1) > 1e-6) basis.push("--scale", String(schaal));
  const staart = ["--slice", "0", "--export-3mf", uit, "--outputdir", werkmap, modelPad];
  const vulling = ["--sparse-infill-density", `${opties.vulling}%`];

  const pogingen = (cfg.vullingDoorgeven && opties.vulling != null)
    ? [[...basis, ...vulling, ...staart], [...basis, ...staart]]
    : [[...basis, ...staart]];

  let laatste = null;
  try{
    for (let i = 0; i < pogingen.length; i++){
      const args = pogingen[i];
      const r = await draai(bambu, args, cfg.tijdslimietSec);
      laatste = r;
      if (existsSync(uit)){
        const cijfers = leesSliceInfo(readFileSync(uit));
        return {
          ...cijfers,
          vullingToegepast: i === 0 && pogingen.length > 1,
          commando: [bambu, ...args].join(" "),
        };
      }
      const melding = (r.stdout + r.stderr).toLowerCase();
      // Kent deze versie de vullingsoptie niet, dan opnieuw zonder.
      if (i + 1 < pogingen.length && !/unknown|unrecognised|unrecognized|invalid option/.test(melding)) break;
    }
  } finally {
    try{ rmSync(werkmap, { recursive: true, force: true }); }catch(e){}
  }
  const uitleg = ((laatste?.stderr || "") + "\n" + (laatste?.stdout || "")).trim().split("\n").slice(-6).join(" ");
  throw new Error("Bambu Studio kon dit model niet slicen. " + (uitleg || laatste?.err?.message || "geen uitleg gekregen"));
}

/* --------------------------- bestand ophalen --------------------------- */

async function haalBestand(db, jobId, index, deel){
  const opslag = deel.storage || {};
  if (opslag.kind === "storage" && deel.storageUrl){
    const res = await fetch(deel.storageUrl);
    if (!res.ok) throw new Error(`bestand ophalen mislukt (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (opslag.kind !== "firestore") throw new Error("onbekende opslagvorm bij dit onderdeel");

  const stukken = [];
  for (let c = 0; c < opslag.chunks; c++){
    const snap = await getDoc(doc(db, "uploads", jobId, "files", `${index}_${c}`));
    if (!snap.exists()) throw new Error(`stuk ${c + 1} van ${opslag.chunks} ontbreekt`);
    stukken.push(Buffer.from(snap.data().b.toUint8Array()));
  }
  let bytes = Buffer.concat(stukken);
  if (opslag.gz){                                   // oudere uploads
    const { gunzipSync } = await import("node:zlib");
    bytes = gunzipSync(bytes);
  }
  if (opslag.bytes && bytes.length !== opslag.bytes)
    throw new Error(`bestand onvolledig: ${bytes.length} van ${opslag.bytes} bytes`);
  if (opslag.sha){
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== opslag.sha) throw new Error("de vingerafdruk klopt niet — het bestand is onderweg gewijzigd");
  }
  return bytes;
}

/* --------------------------- de brug zelf --------------------------- */

function log(...a){ console.log(new Date().toISOString().slice(11,19), ...a); }

async function verwerkOpdracht(omg, jobId){
  const { db } = omg;
  const snap = await getDoc(doc(db, "uploads", jobId));
  if (!snap.exists()) return;
  const job = snap.data();
  const delen = job.parts || [];
  log(`opdracht ${jobId}: ${delen.length} onderdeel/onderdelen`);

  for (let i = 0; i < delen.length; i++){
    const deel = delen[i];
    if (deel.slice?.status === "klaar") continue;

    await schrijfDeel(db, jobId, i, { status: "bezig" });
    const werkmap = mkdtempSync(join(tmpdir(), "layercraft-in-"));
    try{
      const bytes = await haalBestand(db, jobId, i, deel);
      const modelPad = join(werkmap, "model" + (extname(deel.fileName || "") || ".stl"));
      writeFileSync(modelPad, bytes);

      log(`  ${deel.name}: slicen (${deel.layerHeight}, ${deel.infill}% vulling, ${deel.filament?.type || "PLA Basic"})`);
      const r = await slice(omg, modelPad, {
        laaghoogte: deel.layerHeight,
        vulling: deel.infill,
        filamentType: deel.filament?.type,
        eenheid: deel.unit,
        schaalPct: deel.scalePct,
      });
      log(`  ${deel.name}: ${Math.round(r.seconden/60)} min, ${r.gram} g (${r.bron})`);
      await schrijfDeel(db, jobId, i, {
        status: "klaar", seconds: r.seconden, grams: r.gram,
        source: r.bron, at: Date.now(),
      });
    }catch(err){
      log(`  ${deel.name}: MISLUKT — ${err.message}`);
      await schrijfDeel(db, jobId, i, { status: "mislukt", error: String(err.message).slice(0, 400), at: Date.now() });
    }finally{
      try{ rmSync(werkmap, { recursive: true, force: true }); }catch(e){}
    }
  }

  // Klaar met deze opdracht: de shop mag hem niet nog eens aanbieden.
  const na = await getDoc(doc(db, "uploads", jobId));
  if (na.exists() && na.data().status === "teslicen"){
    const alles = (na.data().parts || []).every(p => p.slice?.status === "klaar" || p.slice?.status === "mislukt");
    if (alles) await updateDoc(doc(db, "uploads", jobId), { status: "geslicet" });
  }
}

/* De onderdelen staan als één lijst in het document, dus lezen we hem eerst
   opnieuw en schrijven we hem daarna in zijn geheel terug. */
async function schrijfDeel(db, jobId, index, slice){
  const ref = doc(db, "uploads", jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const delen = [...(snap.data().parts || [])];
  if (!delen[index]) return;
  delen[index] = { ...delen[index], slice: { ...(delen[index].slice || {}), ...slice } };
  await updateDoc(ref, { parts: delen });
}

async function main(){
  const cfg = laadInstellingen();
  const bambu = zoekBambu(cfg);
  const profielen = zoekProfielMap(cfg, bambu);
  log("Bambu Studio:", bambu);
  log("profielen:   ", profielen);

  const testIndex = process.argv.indexOf("--test");
  if (testIndex >= 0){
    const bestand = process.argv[testIndex + 1];
    if (!bestand || !existsSync(bestand)){
      console.error("Gebruik: node brug.mjs --test pad/naar/model.stl");
      process.exit(1);
    }
    log("proefslice van", bestand);
    const r = await slice({ cfg, bambu, profielen }, bestand, {
      laaghoogte: "0.20mm", vulling: 20, filamentType: "PLA Basic", eenheid: "mm", schaalPct: 100,
    });
    console.log("\nGelukt.");
    console.log("  printtijd:", Math.floor(r.seconden/3600) + "u " + String(Math.round(r.seconden%3600/60)).padStart(2,"0") + "m");
    console.log("  filament: ", r.gram, "g");
    console.log("  gelezen uit:", r.bron);
    if (cfg.vullingDoorgeven && !r.vullingToegepast) console.log("  let op: de vullingsoptie werd niet aanvaard, er is met het profiel gewerkt");
    console.log("\nCommando dat gebruikt is:\n  " + r.commando + "\n");
    return;
  }

  if (!cfg.email || !cfg.wachtwoord){
    console.error("Vul je e-mailadres en wachtwoord van de shop in bij instellingen.json.");
    process.exit(1);
  }

  await laadFirebase();
  const app = initializeApp(FIREBASE);
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInWithEmailAndPassword(auth, cfg.email, cfg.wachtwoord);
  log("ingelogd als", cfg.email);

  const omg = { cfg, bambu, profielen, db };
  let bezig = false;
  const wachtrij = new Set();

  async function werkAf(){
    if (bezig) return;
    bezig = true;
    try{
      while (wachtrij.size){
        const id = wachtrij.values().next().value;
        wachtrij.delete(id);
        try{ await verwerkOpdracht(omg, id); }
        catch(err){ log(`opdracht ${id} mislukt: ${err.message}`); }
      }
    } finally { bezig = false; }
  }

  onSnapshot(query(collection(db, "uploads"), where("status", "==", "teslicen")), snap => {
    for (const d of snap.docs) wachtrij.add(d.id);
    if (wachtrij.size) werkAf();
  }, err => log("kan de opdrachten niet volgen:", err.message));

  // Een levensteken, zodat je in Shopbeheer ziet of de brug meedraait.
  const klop = () => setDoc(doc(db, "meta", "slicebrug"), {
    lastSeen: Date.now(), host: process.env.COMPUTERNAME || process.env.HOSTNAME || "onbekend",
    bambu, version: 1,
  }).catch(()=>{});
  klop();
  setInterval(klop, 60000);

  log("de brug draait — laat dit venster open staan");
}

main().catch(err => { console.error("\n" + err.message + "\n"); process.exit(1); });
