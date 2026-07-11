// handles alarm firing, notifications, and the
// looping "ring until dismissed" audio via an offscreen document.

const TIMER_ALARM_NAME = "focustime-timer";
const ALARM_PREFIX = "focustime-alarm-";
const OFFSCREEN_URL = "offscreen.html";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["alarms"], (data) => {
    if (!data.alarms) chrome.storage.local.set({ alarms: [] });
  });
  chrome.storage.local.set({ ringing: null });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TIMER_ALARM_NAME) {
    handleTimerFired();
  } else if (alarm.name.startsWith(ALARM_PREFIX)) {
    handleClockAlarmFired(alarm.name);
  }
});

/* 
   Offscreen audio (rings until the user takes an action)
 */
let creatingOffscreen = null;

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.();
  if (has) return;
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }
  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Ring an alarm/timer sound until the user dismisses it.",
  });
  await creatingOffscreen;
  creatingOffscreen = null;
}

async function startRinging(kind, refId) {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ target: "offscreen", type: "start-ringing" });
  chrome.storage.local.set({ ringing: { kind, refId, startedAt: Date.now() } });
}

async function stopRinging() {
  chrome.runtime.sendMessage({ target: "offscreen", type: "stop-ringing" });
  chrome.storage.local.set({ ringing: null });
  const has = await chrome.offscreen.hasDocument?.();
  if (has) chrome.offscreen.closeDocument();
}

// Popup asks us to stop ringing when the user taps "Dismiss".
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "stop-ringing-request") {
    stopRinging();
  }
});

/* 
   Notification actions (Stop / Dismiss buttons)
 */
chrome.notifications.onButtonClicked.addListener((notifId) => {
  stopRinging();
  chrome.notifications.clear(notifId);
});

chrome.notifications.onClicked.addListener((notifId) => {
  stopRinging();
  chrome.notifications.clear(notifId);
});

/* 
   Timer completion
 */
function handleTimerFired() {
  chrome.storage.local.get(["timer"], (data) => {
    const label =
      data.timer && data.timer.label ? data.timer.label : "Your countdown";
    chrome.notifications.create("focustime-timer-done", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Time's up",
      message: `${label} has finished.`,
      priority: 2,
      requireInteraction: true,
      buttons: [{ title: "Stop ringing" }],
    });
    chrome.storage.local.set({
      timer: { running: false, endAt: null, duration: 0, label: "" },
    });
    startRinging("timer", "focustime-timer-done");
  });
}

/* 
   Clock alarm completion
 */
function handleClockAlarmFired(alarmName) {
  const id = alarmName.slice(ALARM_PREFIX.length);
  chrome.storage.local.get(["alarms"], (data) => {
    const list = data.alarms || [];
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const item = list[idx];

    const notifId = "focustime-clock-" + id;
    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Alarm",
      message: item.label ? item.label : `It's ${item.time}`,
      priority: 2,
      requireInteraction: true,
      buttons: [{ title: "Stop ringing" }],
    });
    startRinging("alarm", notifId);

    if (item.repeat) {
      const next = nextOccurrence(item.time);
      chrome.alarms.create(alarmName, { when: next });
    } else {
      item.enabled = false;
      list[idx] = item;
      chrome.storage.local.set({ alarms: list });
    }
  });
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
