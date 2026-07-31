import { useEffect, useRef, useState } from "react";
import { defaultFallback, mockQA } from "../data/mockData";
import "./ChatWidget.css";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
}

let idCounter = 0;
const nextId = () => ++idCounter;

// --- Mocked backend call ---------------------------------------------------
// Replace this with a real call to your FastAPI backend, e.g.:
//
// async function askBackend(question: string): Promise<string> {
//   const res = await fetch("http://<server>:8000/ask", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ question }),
//   });
//   const data = await res.json();
//   return data.answer;
// }
async function askBackend(question: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const q = question.toLowerCase();
  const hit = mockQA.find((entry) => entry.match.some((kw) => q.includes(kw)));
  return hit ? hit.answer : defaultFallback;
}
// ---------------------------------------------------------------------------

const GREETING = "Hii, how may I help you? 👋";
const IDLE_TRIGGER_MS = 3000; // stand-in for the 2-3s "stare" trigger (real version: face-api.js)

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAttractBubble, setShowAttractBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "bot", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulates the "stare at screen for 2-3s -> auto greeting" behavior.
  // In production, swap this timer for a face-api.js / MediaPipe presence
  // signal that fires the same setShowAttractBubble(true) call.
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => setShowAttractBubble(true), IDLE_TRIGGER_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const openChat = () => {
    setIsOpen(true);
    setShowAttractBubble(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    const answer = await askBackend(trimmed);

    setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: answer }]);
    setIsTyping(false);
  };

  return (
    <div className="chat-widget-root">
      {!isOpen && showAttractBubble && (
        <button className="attract-bubble" onClick={openChat}>
          {GREETING}
        </button>
      )}

      {isOpen && (
        <div className={`chat-panel ${isFullscreen ? "fullscreen" : ""}`}>
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">IU</div>
              <div>
                <div className="chat-title">IEM-UEM Assistant</div>
                <div className="chat-subtitle">Ask about the college & university</div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-icon-btn"
                onClick={() => setIsFullscreen((f) => !f)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
              >
                {isFullscreen ? (
                  // Minimize icon: arrows pointing inward
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3v4a1 1 0 0 1-1 1H4" />
                    <path d="M20 9h-4a1 1 0 0 1-1-1V4" />
                    <path d="M4 15h4a1 1 0 0 1 1 1v4" />
                    <path d="M15 20v-4a1 1 0 0 1 1-1h4" />
                  </svg>
                ) : (
                  // Expand icon: arrows pointing outward (diagonal)
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                )}
              </button>
              <button className="chat-icon-btn" onClick={closeChat} aria-label="Close chat" title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.role}`}>
                <div className={`chat-bubble ${m.role}`}>{m.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble-row bot">
                <div className="chat-bubble bot typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask a question about IEM-UEM..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            />
            <button
              className="chat-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <button
          className={`chat-fab ${isOpen ? "open" : ""}`}
          onClick={() => (isOpen ? closeChat() : openChat())}
          aria-label="Toggle chat"
        >
          {isOpen ? "✕" : "💬"}
        </button>
      )}
    </div>
  );
}
