import "./Ticker.css";

interface TickerProps {
  items: string[];
  position: "top" | "bottom";
}

export default function Ticker({ items, position }: TickerProps) {
  // Duplicate the items so the scroll loop is seamless.
  const loopItems = [...items, ...items];

  return (
    <div className={`ticker ticker-${position}`}>
      {position === "bottom" && <div className="ticker-label">CAMPUS UPDATES</div>}
      <div className="ticker-track-wrapper">
        <div className={`ticker-track ticker-track-${position}`}>
          {loopItems.map((item, i) => (
            <span className="ticker-item" key={i}>
              {item}
              <span className="ticker-dot">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
