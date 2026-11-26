// Seite „Für Lehrkräfte“ (Welle 11, Schritt 12): Link und QR-Code für die Klasse. Erreichbar über die Adresse
// …/#lehrkraft und den Textlink am Ende der Statistik, kein Reiter in der unteren Leiste. Anrede „Sie“.
// Die Seite setzt NICHTS auf diesem Gerät: Sie liest und schreibt keinen Spielstand (kein ctx.state, kein
// ctx.save, kein localStorage), sie erzeugt nur Link und Code. Gesetzt wird der Jahrgang erst auf dem Gerät des
// Kindes nach dessen Bestätigung (app.js). Der QR-Code entsteht im Gerät (src/qr.js), ohne Netz.
import { JAHRGAENGE, dranFor, buildLink, klasseText } from "../klasse.js";
import { qrSvg } from "../qr.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

/* ---------- Reine Teile (ohne DOM, getestet in test/views/lehrkraft.test.js) ---------- */

// Auswahl „bis Stufe …“ eines Pakets: 0 = „noch nichts“, sonst Nummer und Titel der Stufe
export function optionsFor(pack) {
  return [{ value: 0, label: "noch nichts" }, ...pack.levels.map((l, i) => {
    const no = l.no ?? i + 1;
    return { value: no, label: `bis Stufe ${no} · ${l.title}` };
  })];
}

// Formular → Einstellung für buildLink: { jahrgang, zweig, dran }
const klasseOf = (form) => ({ jahrgang: form.jahrgang, zweig: form.mug ? "mug" : null, dran: { ...form.dran } });

// Link für die Klasse (nur Abweichungen von der Voreinstellung im Link, siehe klasse.buildLink); jeder Link ist
// einer, den parseLink annimmt (Rundlauf in den Tests)
export const linkFor = (base, form, packs) => buildLink(base, klasseOf(form), packs);
// Link „Jahrgang wieder entfernen“
export const removeLinkFor = (base) => buildLink(base, null, []);

// Formular mit der Voreinstellung eines Jahrgangs (Tabelle in klasse.js)
export const presetForm = (jahrgang, mug = false) => ({ jahrgang, mug: !!mug, dran: dranFor(jahrgang, mug ? "mug" : null) });
// Entspricht die Auswahl der Voreinstellung?
export function isPreset(form, packs) {
  const def = dranFor(form.jahrgang, form.mug ? "mug" : null) || {};
  return packs.every((p) => (form.dran[p.id] || 0) === (def[p.id] || 0));
}
export const presetLabel = (jahrgang) => `Voreinstellung für Jahrgang ${jahrgang}`;

// Sprechende Beschriftung des Codes für Screenreader: „QR-Code für Jahrgang 6“ (mit Zweig und „eigene Auswahl“
// wie in der Bestätigung auf dem Gerät des Kindes)
export const qrLabel = (form) => `QR-Code für ${klasseText(klasseOf(form))}`;
export const REMOVE_LABEL = "QR-Code zum Entfernen des Jahrgangs";

// Modulgröße: Code für die Klasse 8 px je Modul (Tafel, Beamer), Code zum Entfernen 6 px (kleiner). Beide mit
// Ruhezone von 4 Modulen (Vorgabe von qrSvg); auf schmalen Bildschirmen verkleinert CSS die Anzeige.
export const QR_SCALE = 8;
export const QR_SCALE_SMALL = 6;
export const QR_TOO_LONG = "Der Link ist zu lang für einen QR-Code. Bitte geben Sie den Link als Text weiter.";
// SVG des Codes oder ein Hinweis, wenn der Text nicht in einen Code passt (qrSvg → null)
export function qrHtml(link, label, scale = QR_SCALE) {
  return qrSvg(link, { scale, label }) || `<p class="small muted">${QR_TOO_LONG}</p>`;
}

// Basis des Links: Adresse der App ohne Angabe nach „#“ und ohne Suchteil
export const baseOf = (loc) => loc.origin + loc.pathname;

/* ---------- Ansicht ---------- */

let form = null;

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function init(c) {
  ctx = c;
  $("#tJahrgang").innerHTML = JAHRGAENGE.map((j) => `<option value="${j}">${j}</option>`).join("");
  $("#tDran").innerHTML = ctx.packs.map((p) => `<label class="dran-row"><span class="dran-pack">${p.title}</span>
      <select data-pack="${p.id}">${optionsFor(p).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select></label>`).join("");
  // Jahrgang oder Zweig gewechselt: Auswahl folgt der Voreinstellung
  $("#tJahrgang").addEventListener("change", () => { form = presetForm(+$("#tJahrgang").value, form.mug); update(); });
  $("#tMug").addEventListener("change", () => { form = presetForm(form.jahrgang, $("#tMug").checked); update(); });
  $("#tDran").addEventListener("change", (e) => {
    const sel = e.target.closest("select[data-pack]");
    if (!sel) return;
    form.dran[sel.dataset.pack] = +sel.value;
    update();
  });
  $("#tPreset").addEventListener("click", () => { form = presetForm(form.jahrgang, form.mug); update(); });
  $("#tCopy").addEventListener("click", () => copy("#tLink", "#tCopied"));
  $("#tCopyRemove").addEventListener("click", () => copy("#tRemoveLink", "#tCopiedRemove"));
  $("#tBig").addEventListener("click", showBig);
  $("#tBack").addEventListener("click", () => ctx.show("home"));
  $("#qrBigClose").addEventListener("click", () => $("#qrBig").close());
  // Fokus nach dem Schließen (Esc oder „Schließen“) zurück auf „QR-Code groß zeigen“
  $("#qrBig").addEventListener("close", () => { $("#qrBigBox").innerHTML = ""; $("#tBig").focus(); });
}

// Link in die Zwischenablage; ohne Zugriff (z. B. ohne https) den Text markieren, damit er sich kopieren lässt
function copy(linkSel, msgSel) {
  const text = $(linkSel).textContent, msg = $(msgSel);
  const select = () => { const r = document.createRange(); r.selectNodeContents($(linkSel)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  const done = (ok) => { msg.textContent = ok ? "Kopiert" : "Link markiert – bitte kopieren"; if (!ok) select(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
  else done(false);
}

function showBig() {
  $("#qrBigBox").innerHTML = qrHtml(linkFor(baseOf(location), form, ctx.packs), qrLabel(form));
  $("#qrBigTitle").textContent = klasseText(klasseOf(form));
  $("#qrBig").showModal();
  $("#qrBigClose").focus();
}

function update() {
  const packs = ctx.packs;
  $("#tJahrgang").value = String(form.jahrgang);
  $("#tMug").checked = form.mug;
  $("#tDran").querySelectorAll("select[data-pack]").forEach((s) => { s.value = String(form.dran[s.dataset.pack] || 0); });
  $("#tPreset").textContent = presetLabel(form.jahrgang);
  $("#tPreset").disabled = isPreset(form, packs);
  $("#tCustom").hidden = isPreset(form, packs);
  const link = linkFor(baseOf(location), form, packs);
  $("#tLink").textContent = link;
  $("#tWhat").textContent = klasseText(klasseOf(form));
  $("#tQr").innerHTML = qrHtml(link, qrLabel(form));
  $("#tCopied").textContent = "";
}

export function render() {
  // Jedes Öffnen beginnt mit Jahrgang 5 und seiner Voreinstellung (unabhängig von einer Einstellung auf diesem Gerät)
  form = presetForm(JAHRGAENGE[0]);
  const remove = removeLinkFor(baseOf(location));
  $("#tRemoveLink").textContent = remove;
  $("#tRemoveQr").innerHTML = qrHtml(remove, REMOVE_LABEL, QR_SCALE_SMALL);
  $("#tCopiedRemove").textContent = "";
  update();
  ctx.renderTop();
}
