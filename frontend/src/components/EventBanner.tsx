import { useState, useEffect } from "react";
import type { EventSlide } from "../api";
import "./EventBanner.css";

interface EventBannerProps {
  events: EventSlide[];
}

export default function EventBanner({ events }: EventBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Reset index if events array changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsTransitioning(true);
  }, [events]);

  useEffect(() => {
    if (!events || events.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    if (!events || events.length <= 1) return;
    
    // When we reach the cloned first slide, wait for animation to complete
    // then silently jump back to the actual first slide without transition
    if (currentIndex === events.length) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 800); // 800ms to match the transition duration
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, events]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Append a clone of the first slide at the end to create a seamless infinite loop
  const slidesToRender = events && events.length > 0 ? [...events, events[0]] : [];
  const numSlides = slidesToRender.length > 0 ? slidesToRender.length : 1;

  return (
    <div className="event-banner">
      <div 
        className="event-slider-track"
        style={{
          transform: `translateX(-${currentIndex * (100 / numSlides)}%)`,
          width: `${numSlides * 100}%`,
          transition: isTransitioning ? 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
      >
        {slidesToRender.length > 0 ? (
          slidesToRender.map((slide, idx) => (
            <div 
              className="event-slide-item" 
              key={idx}
              style={{ width: `${100 / numSlides}%` }}
            >
              {slide.image_url && (
                <img className="event-image" src={slide.image_url} alt={slide.title} />
              )}
              <div className="event-overlay" />
              <div className="event-text">
                <span className="event-date">{today}</span>
                <h1 className="event-title">{slide.title || ""}</h1>
                <p className="event-subtitle">{slide.subtitle || ""}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="event-slide-item" style={{ width: "100%" }}>
             <div className="event-overlay" />
          </div>
        )}
      </div>
    </div>
  );
}
