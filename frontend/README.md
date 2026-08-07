# Frontend -- Kiosk UI + Admin Portal

TypeScript + React (Vite) kiosk interface: scrolling accreditation/achievement
tickers, today's event banner, and a light-themed, Claude-style chat widget
with voice input/output and camera-based presence detection. Also includes
an admin portal for managing kiosk content.

## Run locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL (usually `http://localhost:5173`) for the
kiosk display, or `http://localhost:5173/admin` for the admin portal.

**Requires the backend running** (`cd ../backend && python run_api.py`) for
real chatbot answers and live content -- without it, the kiosk falls back to
mock data from `src/data/mockData.ts` so the UI still renders.

## Connecting to a non-default backend URL

The API base URL defaults to `http://localhost:8000`. Override it for a
deployed backend via an environment variable:

```bash
# .env.local (create this file, gitignored)
VITE_API_BASE_URL=http://192.168.1.50:8000
```

## Structure

```
src/
  api.ts                  API client (kiosk + admin), talks to the FastAPI backend
  components/
    KioskHeader.tsx         IEM + UEM logos header bar
    Ticker.tsx               top/bottom auto-scrolling news ticker
    EventBanner.tsx          center event image + text
    ChatWidget.tsx            chat icon + panel: voice I/O, presence detection, fullscreen
  hooks/
    usePresenceDetection.ts   camera-based face detection (face-api.js)
    useSpeechSynthesis.ts     text-to-speech (reads bot answers aloud)
    useSpeechToText.ts         voice input
  admin/
    AdminApp.tsx              admin portal: login + dashboard
    EventEditor.tsx            event banner image/text editor
    TickerEditor.tsx           ticker item list editor (add/remove/reorder)
  data/
    mockData.ts               fallback content used if the backend is unreachable
  App.tsx                    kiosk shell, fetches live content from the backend
  main.tsx                   routes "/" to the kiosk, "/admin" to the admin portal
```

## Admin portal

Visit `/admin`, log in with the backend's configured admin credentials (see
`backend/README.md` -- defaults are `admin` / `changeme123`, **change these
before deploying**). From there you can:

- Upload a new event banner image and edit its title/subtitle
- Add, remove, reorder, and edit items in both scrolling tickers
  (accreditations/achievements on top, campus updates on bottom)
- Trigger a chatbot knowledge-base re-index after adding new files to
  `backend/knowledge_base/`, without restarting the backend

Changes save immediately to the backend and the kiosk picks them up within
60 seconds (it polls `/content` periodically) or on its next page load.

## Presence detection

The auto-open-on-approach behavior uses `face-api.js` running entirely
client-side against the kiosk's webcam -- no video/image data is ever sent
anywhere, only a boolean "face present" signal. See
`src/hooks/usePresenceDetection.ts` for tuning (hold duration, confidence
threshold, etc).

## Voice features

Text-to-speech and speech-to-text both use the browser's built-in Web Speech
API (no external service, no backend involvement). See
`src/hooks/useSpeechSynthesis.ts` and `src/hooks/useSpeechToText.ts`.

## Production build

```bash
npm run build
```

Outputs static files to `dist/`. Serve these from the college server (nginx,
or any static file host) alongside the backend. **Configure your web server
to fall back to `index.html` for unknown paths** (SPA routing) so that
navigating directly to `/admin` works, not just clicking to it from `/`.
