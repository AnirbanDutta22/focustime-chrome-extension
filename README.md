# FocusTime: Stopwatch, Timer & Alarm (Chrome Extension)

A handcrafted, character-driven Chrome extension with three tools in one popup:

- **Stopwatch** — start/pause/resume, reset, lap tracking, with a painterly glowing ring and an orbiting light dot.
- **Timer** — countdown from a custom H/M/S (tap-to-step controls) or playful tilted preset tokens (5/10/15/25/60 min).
- **Alarm** — one-time or daily-repeating alarms with an optional label, toggle on/off.

### Design language

- Palette: near-black `#090B10` background with exactly two accents — cyan `#2596BE` and crimson `#AE0123` — no purple gradients, no generic glass.
- A living backdrop: slow-morphing organic blobs, film grain, a tiny orbiting "planet," a faint constellation, and drifting sparks.
- The countdown/stopwatch ring is the hero: a rough, hand-painted stroke (SVG turbulence + displacement, not a clean vector circle), wrapped in a soft colored glow, breathing gently even at rest.
- Buttons have real personality: the Start button is a glossy 3D "candy" capsule with inset highlights and a colored ambient glow; secondary buttons feel carved from acrylic; preset tokens are tilted, overlapping, blob-edged chips with tiny emoji.
- Every interaction uses spring easing (slight overshoot) instead of linear transitions — tabs snap with a bounce, buttons squish on press, chips lift on hover.
- The active tab's accent (cyan for Stopwatch/Alarm, crimson for Timer) subtly recolors the ring, glow, and Start button — a small, cohesive detail rather than a static theme.

### Rings until you dismiss it

When a timer or alarm fires, FocusTime plays a **looping chime that keeps ringing** — even if you close the popup — using a Chrome offscreen document, so the sound isn't tied to the popup's lifetime. It only stops when you take an action:

- Tap **"Stop ringing"** on the desktop notification, or
- Reopen the extension and tap **Dismiss** on the full-screen ringing card (with its own shaking candy-bell).

## Install (Load Unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this folder (`stopwatch-extension`).
5. Pin the extension (puzzle-piece icon in the toolbar → pin **FocusTime**) so it's one click away.

## Notes

- Notifications require the browser to have notification permission for Chrome itself (OS-level).
- Countdown/alarm scheduling uses `chrome.alarms`, reliable even if the service worker goes idle.
- The looping ring sound uses `chrome.offscreen` — Manifest V3's supported way to play audio outside a visible page.
- No external libraries, fonts, or network requests — everything is drawn/animated with native CSS and SVG.

## File structure

```
stopwatch-extension/
├── manifest.json      # Manifest V3 config
├── popup.html         # Popup UI markup (rings, blobs, candy buttons, decorations)
├── styles.css          # The whole visual language — colors, shapes, springs, glow
├── popup.js             # Stopwatch / Timer / Alarm logic (runs in popup)
├── background.js        # Service worker — fires notifications, manages ringing
├── offscreen.html/.js   # Offscreen document — loops the ring sound until dismissed
└── icons/               # Extension icons (16/32/48/128)
```

## Customizing

- Change the two accents in `styles.css` under `:root` (`--cyan`, `--crimson` and their light/dark shades).
- Adjust the ring's hand-painted wobble via the `feTurbulence`/`feDisplacementMap` values in `popup.html` (`#rough-sw` / `#rough-tm` filters).
- Add more preset tokens by adding another `<button class="chip" data-secs="...">` in `popup.html`.
- Tweak the ring chime notes/timing in `offscreen.js` (`chime()` function).
