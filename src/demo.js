// Vorführung (gemeinsamer Baukasten, docs/ARCHITEKTUR.md): eine Folge von Bildern mit den Knöpfen
// Zurück / Abspielen (Pause) / Weiter ›, Schritt-Marken („1 · …“ violett, „2 · …“ grün), Bildzähler und
// großer Ergebniskarte. Die Bilder baut das Paket (rein, in node testbar), dieses Modul zeigt sie nur.
//
// demo = { steps: ["1 · Grob: Stufen zählen", "2 · Fein: Halbtöne zählen"], frames: [Bild …] }
// Bild = { step, body, text?, result?, tones? }
//   step: 0 = Frage (noch kein Schritt), 1 bzw. 2 = Denkschritt, steps.length + 1 = Ergebnis
//   body: HTML der Bühne (Notenzeile, Klaviatur, Tabelle …)
//   text: kurzer Satz zum Bild (in der Farbe des Schritts); result: { title, chips: [{ step, text }] }
//   tones: Noten, die beim Zeigen des Bilds nacheinander erklingen (audio.js, beachtet „Ton aus“)
import { play } from "./audio.js";

// Fester Satz zum Zählen (Welle 10, B6): in den Hilfen der Intervalle ab Stufe 3 und der parallelen
// Molltonart sowie in deren Vorführungen beim Wechsel zu Schritt 2. Die Starttaste trägt dort „Start“.
export const COUNT_RULE = "Stufen: Beide Noten zählen mit. Halbtöne: Die Starttaste („Start“, kurz „S“) zählt nicht, du zählst die Schritte.";

// Abspielen: ein Bild pro Sekunde, am Ende hält die Vorführung an
export const FRAME_MS = 1000;
// Abstand zwischen mehreren Tönen eines Bilds
export const TONE_GAP = 260;

/* ---------- Reine Teile (getestet in test/demo.test.js) ---------- */

// Zustand einer Schritt-Marke s (1, 2 …) im Bild frame: "on" (dieser Schritt), "done" (schon erledigt) oder ""
export const markState = (frame, s) => (frame.step === s ? "on" : frame.step > s ? "done" : "");

export const marksHtml = (demo, i) => demo.steps
  .map((t, k) => { const st = markState(demo.frames[i], k + 1); return `<span class="demo-mark s${k + 1}${st ? " " + st : ""}">${t}</span>`; })
  .join("");

// Ergebniskarte: groß der Titel, darunter die Marken je Schritt in dessen Farbe; note (optional, seit Welle 10):
// ein ganzer Satz darunter (Notenwerte: „Die Lücke steht auf „2 +“, dort steht jetzt die Achtelnote.“)
export const resultHtml = (r) => `<div class="demo-result"><p class="demo-result-title">${r.title}</p>`
  + `<p class="demo-chips">${(r.chips || []).map((c) => `<span class="demo-chip s${c.step}">${c.text}</span>`).join("")}</p>`
  + `${r.note ? `<p class="demo-result-note">${r.note}</p>` : ""}</div>`;

// Satz bzw. Ergebniskarte zum Bild
export const sayHtml = (frame) => (frame.result ? resultHtml(frame.result) : `<p class="demo-text s${frame.step}">${frame.text || ""}</p>`);

export const countText = (demo, i) => `${i + 1} / ${demo.frames.length}`;
// „Weiter ›“ (kurz, passt bei 320 px in eine Zeile); für Screenreader heißt der Knopf „Nächster Schritt“
// (NEXT_ARIA), damit er nicht mit „Nächste Aufgabe“ (engine.js) darunter verwechselt wird
export const PREV_LABEL = "Zurück", NEXT_LABEL = "Weiter ›", NEXT_ARIA = "Nächster Schritt";
export const playLabel = (playing) => (playing ? "Pause" : "Abspielen");

// Ganze Vorführung im Bild i (playing: Abspielen läuft)
export function demoHtml(demo, i = 0, playing = false) {
  const last = demo.frames.length - 1;
  return `<div class="demo-steps">${marksHtml(demo, i)}</div>`
    + `<div class="demo-controls">`
    + `<button class="btn" data-act="prev"${i <= 0 ? " disabled" : ""}>${PREV_LABEL}</button>`
    + `<button class="btn primary" data-act="play">${playLabel(playing)}</button>`
    + `<button class="btn" data-act="next" aria-label="${NEXT_ARIA}"${i >= last ? " disabled" : ""}>${NEXT_LABEL}</button>`
    + `<span class="small muted num demo-count">${countText(demo, i)}</span></div>`
    + `<div class="demo-say" aria-live="polite">${sayHtml(demo.frames[i])}</div>`
    + `<div class="demo-stage">${demo.frames[i].body}</div>`;
}

/* ---------- DOM ---------- */

const active = new Set();

// Alle laufenden Vorführungen anhalten (Wechsel der Ansicht, Ende der Runde)
export function stopDemos() { [...active].forEach((h) => h.stop()); }

// Vorführung in root zeigen. Ergebnis: { stop, show(i), index() }. Die Knöpfe bleiben stehen (der Fokus
// bleibt beim gedrückten Knopf), nur Marken, Satz, Bühne und Zähler werden ersetzt.
export function mountDemo(root, demo) {
  let i = 0, timer = null, tones = [];
  const last = demo.frames.length - 1;
  root.classList.add("demo");
  root.innerHTML = demoHtml(demo, 0);
  const $ = (s) => root.querySelector(s);
  const btn = { prev: $('[data-act="prev"]'), play: $('[data-act="play"]'), next: $('[data-act="next"]') };

  function update() {
    $(".demo-steps").innerHTML = marksHtml(demo, i);
    $(".demo-say").innerHTML = sayHtml(demo.frames[i]);
    $(".demo-stage").innerHTML = demo.frames[i].body;
    $(".demo-count").textContent = countText(demo, i);
    btn.prev.disabled = i <= 0; btn.next.disabled = i >= last;
    btn.play.textContent = playLabel(!!timer);
  }
  function silence() { tones.forEach(clearTimeout); tones = []; }
  function sound() {
    silence();
    (demo.frames[i].tones || []).forEach((n, k) => { if (k === 0) play(n); else tones.push(setTimeout(() => play(n), k * TONE_GAP)); });
  }
  function pause() { if (timer) clearTimeout(timer); timer = null; }
  function show(k) { i = Math.max(0, Math.min(last, k)); update(); sound(); }
  function tick() {
    timer = null;
    if (!root.isConnected) return stop();
    i = Math.min(last, i + 1);
    if (i < last) timer = setTimeout(tick, FRAME_MS);
    update(); sound();
  }
  function toggle() {
    if (timer) { pause(); update(); return; }
    if (i >= last) i = 0;
    timer = setTimeout(tick, FRAME_MS);
    update(); sound();
  }
  function stop() { pause(); silence(); active.delete(handle); if (root.isConnected) update(); }

  root.onclick = (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !root.contains(b)) return;
    if (b.dataset.act === "play") return toggle();
    pause();
    show(i + (b.dataset.act === "next" ? 1 : -1));
  };
  const handle = { stop, show, index: () => i, root };
  active.add(handle);
  return handle;
}
