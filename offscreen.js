// plays a looping chime using the Web Audio API.
// Runs in an offscreen document so it keeps ringing even if the
// popup is closed, until the user takes an action to stop it.

let ctx = null;
let loopTimer = null;
let playing = false;

function chime() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 — pleasant triad
  notes.forEach((freq, i) => {
    const start = now + i * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

function startRinging() {
  if (playing) return;
  playing = true;
  ctx = new AudioContext();
  chime();
  loopTimer = setInterval(chime, 1400);
}

function stopRinging() {
  playing = false;
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  if (ctx) {
    ctx.close();
    ctx = null;
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "start-ringing") startRinging();
  if (msg.type === "stop-ringing") stopRinging();
});
