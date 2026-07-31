import "./EventBanner.css";

interface EventBannerProps {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export default function EventBanner({ title, subtitle, imageUrl }: EventBannerProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="event-banner">
      <img className="event-image" src={imageUrl} alt={title} />
      <div className="event-overlay" />
      <div className="event-text">
        <span className="event-date">{today}</span>
        <h1 className="event-title">{title}</h1>
        <p className="event-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
