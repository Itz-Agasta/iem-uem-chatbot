import { useEffect, useState } from "react";
import KioskHeader from "./components/KioskHeader";
import Ticker from "./components/Ticker";
import EventBanner from "./components/EventBanner";
import ChatWidget from "./components/ChatWidget";
import { topTickerItems, bottomTickerItems, todayEvent } from "./data/mockData";
import { fetchContent, resolveImageUrl, type KioskContent } from "./api";
import "./App.css";

// Re-fetch content periodically so admin-portal changes (new event image,
// updated tickers) show up on the kiosk without needing a manual refresh.
const CONTENT_POLL_MS = 60_000;

export default function App() {
  // Seed with mock data so the kiosk renders something immediately, even
  // before the first backend fetch resolves (or if the backend is down).
  const [content, setContent] = useState<KioskContent>({
    top_ticker: topTickerItems,
    bottom_ticker: bottomTickerItems,
    event: {
      title: todayEvent.title,
      subtitle: todayEvent.subtitle,
      image_url: todayEvent.imageUrl,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchContent();
        if (!cancelled) setContent(data);
      } catch {
        // Backend not reachable yet -- keep showing the current (mock or
        // last-fetched) content rather than blanking the screen.
      }
    }

    load();
    const interval = setInterval(load, CONTENT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasEventImage = !!content.event.image_url;

  return (
    <div className="kiosk-shell">
      <KioskHeader />

      <Ticker items={content.top_ticker} position="top" />

      <EventBanner
        title={content.event.title}
        subtitle={content.event.subtitle}
        imageUrl={hasEventImage ? resolveImageUrl(content.event.image_url) : todayEvent.imageUrl}
      />

      <Ticker items={content.bottom_ticker} position="bottom" />

      <ChatWidget />
    </div>
  );
}
