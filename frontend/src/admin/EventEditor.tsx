import { useRef, useState } from "react";
import { resolveImageUrl } from "../api";

interface EventEditorProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  onSaveText: (title: string, subtitle: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
}

export default function EventEditor({
  title,
  subtitle,
  imageUrl,
  onSaveText,
  onUploadImage,
}: EventEditorProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localSubtitle, setLocalSubtitle] = useState(subtitle);
  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveText = async () => {
    setSavingText(true);
    setMessage("");
    try {
      await onSaveText(localTitle, localSubtitle);
      setMessage("Saved.");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingText(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      await onUploadImage(file);
      setMessage("Image uploaded.");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-card">
      <h2 className="admin-card-title">Today's Event Banner</h2>
      <p className="admin-card-desc">
        Shown on the kiosk's home screen -- the main image and headline for today.
      </p>

      <div className="event-editor-image-row">
        <div className="event-editor-preview">
          {imageUrl ? (
            <img src={resolveImageUrl(imageUrl)} alt="Event banner preview" />
          ) : (
            <div className="event-editor-preview-empty">No image uploaded yet</div>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            className="admin-btn secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload New Image"}
          </button>
          <p className="admin-hint">JPEG, PNG, or WebP. Max 8MB.</p>
        </div>
      </div>

      <label className="admin-label">Title</label>
      <input
        className="admin-input"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        placeholder="e.g. Guest Lecture: AI in Modern Engineering"
      />

      <label className="admin-label">Subtitle</label>
      <input
        className="admin-input"
        value={localSubtitle}
        onChange={(e) => setLocalSubtitle(e.target.value)}
        placeholder="e.g. Auditorium Hall 2 · 11:00 AM – 1:00 PM"
      />

      <div className="admin-card-footer">
        <button className="admin-btn" onClick={handleSaveText} disabled={savingText}>
          {savingText ? "Saving..." : "Save Text"}
        </button>
        {message && <span className="admin-saved-message">{message}</span>}
      </div>
    </div>
  );
}
