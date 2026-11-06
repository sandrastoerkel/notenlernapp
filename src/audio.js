// Töne per Web Audio. Der AudioContext entsteht erst beim ersten Ton (nach einer Nutzeraktion).
import { freq } from "./music.js";

let ctx = null;
let muted = false;

// Ton aus- oder einschalten (app.js gibt state.muted weiter)
export function setMuted(m) { muted = !!m; }
export const isMuted = () => muted;

// Note n kurz anspielen: Dreieckswelle, kurzer Anschlag, Ausklingen nach 0,9 s
export function play(n, vol = 0.22) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = freq(n);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.95);
  } catch (e) { /* kein Ton verfügbar */ }
}

// Mehrere Töne gleichzeitig anspielen (Akkord): alle Oszillatoren starten zur selben Zeit;
// die Lautstärke je Ton sinkt mit der Zahl der Töne, damit der Akkord nicht lauter wird als ein Ton.
export function playChord(notes, vol = 0.22) {
  if (muted || !notes.length) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime, v = vol / Math.sqrt(notes.length);
    for (const n of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = freq(n);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.45);
    }
  } catch (e) { /* kein Ton verfügbar */ }
}
