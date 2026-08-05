import "./KioskHeader.css";

export default function KioskHeader() {
  return (
    <div className="kiosk-header">
      <img src="/branding/iem-logo.png" alt="Institute of Engineering & Management" className="brand-logo brand-logo-left" />
      <img src="/branding/uem-logo.png" alt="University of Engineering & Management" className="brand-logo brand-logo-right" />
    </div>
  );
}
