// UI + logic for Stopwatch, Timer, and Alarm tabs

const RING_CIRC = 2 * Math.PI * 86; // 540.35

/* 
   Small helpers
 */
function pad(n, len = 2) {
  return String(Math.floor(n)).padStart(len, "0");
}

function setRingProgress(progressEl, glowEl, fraction) {
  const offset = RING_CIRC * (1 - Math.max(0, Math.min(1, fraction)));
  progressEl.style.strokeDashoffset = offset;
  if (glowEl) glowEl.style.strokeDashoffset = offset;
}

/* 
   Tabs — sliding capsule indicator + accent switching
 */
const tabBtns = document.querySelectorAll(".tab-btn");
const tabIndicator = document.getElementById("tab-indicator");

function moveIndicatorTo(btn) {
  const index = Array.from(tabBtns).indexOf(btn);
  tabIndicator.style.transform = `translateX(${index * 100}%)`;
}

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    document.body.setAttribute("data-tab", btn.dataset.tab);
    moveIndicatorTo(btn);
  });
});

/* 
   STOPWATCH
 */
const swDisplay = document.getElementById("sw-display");
const swStartBtn = document.getElementById("sw-start");
const swResetBtn = document.getElementById("sw-reset");
const swLapBtn = document.getElementById("sw-lap");
const swLapsEl = document.getElementById("sw-laps");
const swRing = document.getElementById("sw-ring-progress");
const swRingGlow = document.querySelector("#stopwatch .ring-glow");
const swDot = document.getElementById("sw-orbit-dot");

let sw = { running: false, startedAt: 0, accumulated: 0, laps: [] };
let swInterval = null;

function formatStopwatch(ms) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function swElapsed() {
  return sw.accumulated + (sw.running ? Date.now() - sw.startedAt : 0);
}

function renderStopwatch() {
  const elapsed = swElapsed();
  swDisplay.textContent = formatStopwatch(elapsed);
  const frac = (elapsed % 60000) / 60000;
  setRingProgress(swRing, swRingGlow, frac);
  const angle = frac * 360;
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = 100 + 86 * Math.cos(rad);
  const cy = 100 + 86 * Math.sin(rad);
  swDot.setAttribute("cx", cx);
  swDot.setAttribute("cy", cy);
  swDot.style.opacity = sw.running ? "1" : "0";
  renderLaps();
}

function renderLaps() {
  swLapsEl.innerHTML = "";
  sw.laps
    .slice()
    .reverse()
    .forEach((lap, i) => {
      const li = document.createElement("li");
      const num = sw.laps.length - i;
      li.innerHTML = `<span>Lap ${num}</span><span>${formatStopwatch(lap)}</span>`;
      swLapsEl.appendChild(li);
    });
}

function saveStopwatch() {
  chrome.storage.local.set({ stopwatch: sw });
}

function startStopwatchInterval() {
  if (swInterval) clearInterval(swInterval);
  swInterval = setInterval(renderStopwatch, 40);
}

swStartBtn.addEventListener("click", () => {
  if (sw.running) {
    sw.accumulated += Date.now() - sw.startedAt;
    sw.running = false;
    clearInterval(swInterval);
    swInterval = null;
    swStartBtn.querySelector(".btn-label").textContent = "Resume";
    swStartBtn.querySelector(".btn-icon").className = "btn-icon play";
    swStartBtn.classList.remove("running");
    swLapBtn.disabled = true;
  } else {
    sw.startedAt = Date.now();
    sw.running = true;
    startStopwatchInterval();
    swStartBtn.querySelector(".btn-label").textContent = "Pause";
    swStartBtn.querySelector(".btn-icon").className = "btn-icon pause";
    swStartBtn.classList.add("running");
    swLapBtn.disabled = false;
  }
  saveStopwatch();
});

swResetBtn.addEventListener("click", () => {
  sw = { running: false, startedAt: 0, accumulated: 0, laps: [] };
  clearInterval(swInterval);
  swInterval = null;
  swStartBtn.querySelector(".btn-label").textContent = "Start";
  swStartBtn.querySelector(".btn-icon").className = "btn-icon play";
  swStartBtn.classList.remove("running");
  swLapBtn.disabled = true;
  renderStopwatch();
  saveStopwatch();
});

swLapBtn.addEventListener("click", () => {
  if (!sw.running) return;
  sw.laps.push(swElapsed());
  renderLaps();
  saveStopwatch();
});

/* 
   TIMER (countdown)
 */
const tmDisplay = document.getElementById("tm-display");
const tmSub = document.getElementById("tm-sub");
const tmStartBtn = document.getElementById("tm-start");
const tmResetBtn = document.getElementById("tm-reset");
const tmRing = document.getElementById("tm-ring-progress");
const tmRingGlow = document.querySelector("#timer .ring-glow");
const tmSetup = document.getElementById("tm-setup");
const tmPresets = document.querySelector(".presets");
const tmH = document.getElementById("tm-h");
const tmM = document.getElementById("tm-m");
const tmS = document.getElementById("tm-s");
const presetChips = document.querySelectorAll(".chip");
const stepBtns = document.querySelectorAll(".step-btn");

const TIMER_ALARM_NAME = "focustime-timer";

let tm = { running: false, endAt: null, duration: 0, label: "" };
let tmInterval = null;

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function getSetupSeconds() {
  const h = parseInt(tmH.value, 10) || 0;
  const m = parseInt(tmM.value, 10) || 0;
  const s = parseInt(tmS.value, 10) || 0;
  return h * 3600 + m * 60 + s;
}

function setSetupFromSeconds(totalSec) {
  tmH.value = Math.floor(totalSec / 3600);
  tmM.value = Math.floor((totalSec % 3600) / 60);
  tmS.value = totalSec % 60;
}

function renderTimerIdle() {
  const totalSec = getSetupSeconds();
  tmDisplay.textContent = formatCountdown(totalSec * 1000);
  tmSub.textContent = "countdown";
  setRingProgress(tmRing, tmRingGlow, 0);
}

function renderTimerRunning() {
  const remaining = tm.endAt - Date.now();
  if (remaining <= 0) {
    // Local UI just resets to idle — background.js owns the actual
    // notification + ringing, triggered by the chrome.alarms event.
    clearInterval(tmInterval);
    tmInterval = null;
    tm = { running: false, endAt: null, duration: 0, label: "" };
    tmStartBtn.querySelector(".btn-label").textContent = "Start";
    tmStartBtn.querySelector(".btn-icon").className = "btn-icon play";
    tmStartBtn.classList.remove("running");
    tmSetup.style.display = "grid";
    tmPresets.style.display = "flex";
    renderTimerIdle();
    return;
  }
  tmDisplay.textContent = formatCountdown(remaining);
  tmSub.textContent = "counting down";
  setRingProgress(tmRing, tmRingGlow, remaining / tm.duration);
}

function saveTimer() {
  chrome.storage.local.set({ timer: tm });
}

function startTimerInterval() {
  if (tmInterval) clearInterval(tmInterval);
  tmInterval = setInterval(renderTimerRunning, 200);
}

tmStartBtn.addEventListener("click", () => {
  if (tm.running) {
    clearInterval(tmInterval);
    tmInterval = null;
    chrome.alarms.clear(TIMER_ALARM_NAME);
    tm = { running: false, endAt: null, duration: 0, label: "" };
    saveTimer();
    tmStartBtn.querySelector(".btn-label").textContent = "Start";
    tmStartBtn.querySelector(".btn-icon").className = "btn-icon play";
    tmStartBtn.classList.remove("running");
    tmSetup.style.display = "grid";
    tmPresets.style.display = "flex";
    renderTimerIdle();
  } else {
    const totalSec = getSetupSeconds();
    if (totalSec <= 0) return;
    const durationMs = totalSec * 1000;
    tm = {
      running: true,
      endAt: Date.now() + durationMs,
      duration: durationMs,
      label: "",
    };
    saveTimer();
    chrome.alarms.create(TIMER_ALARM_NAME, { when: tm.endAt });
    tmStartBtn.querySelector(".btn-label").textContent = "Cancel";
    tmStartBtn.querySelector(".btn-icon").className = "btn-icon pause";
    tmStartBtn.classList.add("running");
    tmSetup.style.display = "none";
    tmPresets.style.display = "none";
    startTimerInterval();
    renderTimerRunning();
  }
});

tmResetBtn.addEventListener("click", () => {
  if (tm.running) return;
  setSetupFromSeconds(300);
  renderTimerIdle();
  presetChips.forEach((c) => c.classList.remove("active"));
});

presetChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    if (tm.running) return;
    setSetupFromSeconds(parseInt(chip.dataset.secs, 10));
    renderTimerIdle();
    presetChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
});

[tmH, tmM, tmS].forEach((input) => {
  input.addEventListener("input", () => {
    if (tm.running) return;
    renderTimerIdle();
    presetChips.forEach((c) => c.classList.remove("active"));
  });
});

const stepLimits = { h: 23, m: 59, s: 59 };
stepBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (tm.running) return;
    const field = btn.dataset.field;
    const dir = parseInt(btn.dataset.dir, 10);
    const input = document.getElementById(`tm-${field}`);
    let val = (parseInt(input.value, 10) || 0) + dir;
    if (val < 0) val = stepLimits[field];
    if (val > stepLimits[field]) val = 0;
    input.value = val;
    renderTimerIdle();
    presetChips.forEach((c) => c.classList.remove("active"));
  });
});

/* 
   ALARM (clock-time alarms)
 */
const alTimeInput = document.getElementById("al-time");
const alLabelInput = document.getElementById("al-label");
const alRepeatInput = document.getElementById("al-repeat");
const alAddBtn = document.getElementById("al-add");
const alListEl = document.getElementById("al-list");
const alEmptyEl = document.getElementById("al-empty");

const ALARM_PREFIX = "focustime-alarm-";

let alarms = [];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nextOccurrence(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

function saveAlarms() {
  chrome.storage.local.set({ alarms });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAlarms() {
  alListEl.innerHTML = "";
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  alEmptyEl.classList.toggle("show", alarms.length === 0);

  alarms.forEach((item) => {
    const li = document.createElement("li");
    li.className = "alarm-item" + (item.enabled ? "" : " disabled");
    li.innerHTML = `
      <div class="alarm-info">
        <span class="alarm-time">${formatTime12(item.time)}</span>
        <span class="alarm-meta">${item.repeat ? "Repeats daily" : "One time"}${item.label ? " · " + escapeHtml(item.label) : ""}</span>
      </div>
      <div class="alarm-actions">
        <label class="switch">
          <input type="checkbox" data-id="${item.id}" class="al-toggle" ${item.enabled ? "checked" : ""} />
          <span class="slider"></span>
        </label>
        <button class="del-btn" data-id="${item.id}">✕</button>
      </div>
    `;
    alListEl.appendChild(li);
  });

  alListEl.querySelectorAll(".al-toggle").forEach((cb) => {
    cb.addEventListener("change", () => toggleAlarm(cb.dataset.id, cb.checked));
  });
  alListEl.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteAlarm(btn.dataset.id));
  });
}

function addAlarm() {
  const time = alTimeInput.value;
  if (!time) return;
  const item = {
    id: uid(),
    time,
    label: alLabelInput.value.trim(),
    repeat: alRepeatInput.checked,
    enabled: true,
  };
  alarms.push(item);
  saveAlarms();
  chrome.alarms.create(ALARM_PREFIX + item.id, { when: nextOccurrence(time) });
  renderAlarms();
  alLabelInput.value = "";
  alRepeatInput.checked = false;
}

function toggleAlarm(id, enabled) {
  const item = alarms.find((a) => a.id === id);
  if (!item) return;
  item.enabled = enabled;
  saveAlarms();
  if (enabled) {
    chrome.alarms.create(ALARM_PREFIX + id, {
      when: nextOccurrence(item.time),
    });
  } else {
    chrome.alarms.clear(ALARM_PREFIX + id);
  }
  renderAlarms();
}

function deleteAlarm(id) {
  alarms = alarms.filter((a) => a.id !== id);
  chrome.alarms.clear(ALARM_PREFIX + id);
  saveAlarms();
  renderAlarms();
}

alAddBtn.addEventListener("click", addAlarm);

/* 
   RINGING OVERLAY — shown whenever background.js is ringing,
   stays until the user taps Dismiss (mirrors the notification's
   "Stop ringing" button, whichever the user reaches first).
 */
const ringOverlay = document.getElementById("ring-overlay");
const ringTitle = document.getElementById("ring-title");
const ringSubtitle = document.getElementById("ring-subtitle");
const ringDismissBtn = document.getElementById("ring-dismiss");

function showRingingOverlay(ringing) {
  if (!ringing) {
    ringOverlay.classList.remove("show");
    return;
  }
  if (ringing.kind === "timer") {
    ringTitle.textContent = "Time's up";
    ringSubtitle.textContent = "Your countdown has finished.";
  } else {
    ringTitle.textContent = "Alarm";
    ringSubtitle.textContent = "Rise and shine — tap to stop the sound.";
  }
  ringOverlay.classList.add("show");
}

ringDismissBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "stop-ringing-request" });
  ringOverlay.classList.remove("show");
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.ringing) {
    showRingingOverlay(changes.ringing.newValue);
  }
});

/* 
   INIT — restore state from storage
 */
function init() {
  chrome.storage.local.get(
    ["stopwatch", "timer", "alarms", "ringing"],
    (data) => {
      // Stopwatch
      if (data.stopwatch) {
        sw = data.stopwatch;
        if (sw.running) {
          swStartBtn.querySelector(".btn-label").textContent = "Pause";
          swStartBtn.querySelector(".btn-icon").className = "btn-icon pause";
          swStartBtn.classList.add("running");
          swLapBtn.disabled = false;
          startStopwatchInterval();
        } else if (sw.accumulated > 0) {
          swStartBtn.querySelector(".btn-label").textContent = "Resume";
        }
      }
      renderStopwatch();

      // Timer
      if (data.timer && data.timer.running && data.timer.endAt > Date.now()) {
        tm = data.timer;
        tmStartBtn.querySelector(".btn-label").textContent = "Cancel";
        tmStartBtn.querySelector(".btn-icon").className = "btn-icon pause";
        tmStartBtn.classList.add("running");
        tmSetup.style.display = "none";
        tmPresets.style.display = "none";
        startTimerInterval();
        renderTimerRunning();
      } else {
        if (data.timer && data.timer.running) {
          chrome.storage.local.set({
            timer: { running: false, endAt: null, duration: 0, label: "" },
          });
        }
        renderTimerIdle();
      }

      // Alarms
      alarms = data.alarms || [];
      renderAlarms();

      // Ringing overlay (in case the popup was reopened mid-ring)
      showRingingOverlay(data.ringing);
    },
  );

  // Default time input to now + 1 min for convenience
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  alTimeInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

init();
