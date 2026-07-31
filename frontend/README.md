# Frontend -- Kiosk UI

TypeScript + React (Vite) kiosk interface: scrolling accreditation/achievement
tickers, today's event banner, and a light-themed, Claude-style chat widget
in the bottom-right corner.

## Run locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL (usually `http://localhost:5173`).

## Structure

```
src/
  components/
    Ticker.tsx         top/bottom auto-scrolling news ticker
    EventBanner.tsx     center static/today's-event image + text
    ChatWidget.tsx       floating chat icon + fullscreen-capable chat panel
  data/
    mockData.ts         ticker content, event info, mocked Q&A answers
  App.tsx                kiosk shell layout
```

## Connecting to the real backend

`ChatWidget.tsx` currently answers from a small mocked Q&A dictionary in
`src/data/mockData.ts` with a fake network delay, so the UI can be reviewed
without the backend running. To connect it for real, replace the body of
`askBackend()` in `ChatWidget.tsx` with a `fetch()` call to the backend's
`/ask` endpoint (see the commented example already in that file).

## Presence detection (not yet implemented)

The auto-greeting bubble currently fires on a 3-second timer as a stand-in
for "someone stood in front of the screen." The trigger point is isolated in
`ChatWidget.tsx` (`useEffect` calling `setShowAttractBubble(true)`) so it can
be swapped for a real `face-api.js` / MediaPipe presence signal later without
touching the rest of the component.
