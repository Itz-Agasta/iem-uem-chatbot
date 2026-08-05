import KioskHeader from "./components/KioskHeader";
import Ticker from "./components/Ticker";
import EventBanner from "./components/EventBanner";
import ChatWidget from "./components/ChatWidget";
import { topTickerItems, bottomTickerItems, todayEvent } from "./data/mockData";
import "./App.css";

export default function App() {
  return (
    <div className="kiosk-shell">
      <KioskHeader />

      <Ticker items={topTickerItems} position="top" />

      <EventBanner
        title={todayEvent.title}
        subtitle={todayEvent.subtitle}
        imageUrl={todayEvent.imageUrl}
      />

      <Ticker items={bottomTickerItems} position="bottom" />

      <ChatWidget />
    </div>
  );
}
