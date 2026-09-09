import { useEffect, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePresenceDetection } from "../hooks/usePresenceDetection";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { askQuestion } from "../api";
import "./ChatWidget.css";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
}

let idCounter = 0;
const nextId = () => ++idCounter;

async function askBackend(question: string): Promise<string> {
  try {
    return await askQuestion(question);
  } catch {
    return "Sorry, I couldn't reach the assistant right now. Please try again in a moment, or ask a staff member for help.";
  }
}

const GREETING = "Hii, how may I help you? 👋";

// How long a face must be continuously present before the chat auto-opens
const OPEN_HOLD_MS = 3000;
// How long the person must be continuously gone before the chat auto-collapses
// (kept short so it feels responsive, but not so short that looking down at
// the keyboard while typing collapses the chat)
const CLOSE_GRACE_MS = 2000;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "bot", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isSpeaking, isSupported: ttsSupported, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const { isListening, isSupported: sttSupported, transcript, startListening, stopListening } = useSpeechToText(
    (finalText) => {
      setInput(finalText);
      sendMessage(finalText);
    }
  );

  // Read out every new bot message as it arrives (unless muted). Skips the
  // very first render so it doesn't speak the initial greeting on mount.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const last = messages[messages.length - 1];
    if (last && last.role === "bot" && !isMuted) {
      speak(last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const scheduleOpen = () => {
    if (openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        setIsOpen(true);
        openTimerRef.current = null;
      }, OPEN_HOLD_MS);
    }
  };

  // Real camera-based presence detection. The camera is acquired once and
  // runs continuously for the page's lifetime (see usePresenceDetection) --
  // this callback just decides what to do with each presence change:
  //  - present for 3s straight while closed  -> open the chat
  //  - absent for 2s straight while open      -> collapse the chat
  const { videoRef } = usePresenceDetection({
    onPresenceChange: (present) => {
      if (present) {
        if (closeTimerRef.current) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        if (!isOpenRef.current) scheduleOpen();
      } else {
        if (openTimerRef.current) {
          window.clearTimeout(openTimerRef.current);
          openTimerRef.current = null;
        }
        if (isOpenRef.current && closeTimerRef.current === null) {
          closeTimerRef.current = window.setTimeout(() => {
            closeChat();
            closeTimerRef.current = null;
          }, CLOSE_GRACE_MS);
        }
      }
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const openChat = () => {
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    stopSpeaking();
    stopListening();
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
      {/* Hidden camera feed used only for local face detection -- never displayed, never sent anywhere */}
      <video ref={videoRef} className="presence-video" muted playsInline />

      {isOpen && (
        <div className={`chat-panel ${isFullscreen ? "fullscreen" : ""}`}>
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">IU</div>
              <div>
                <div className="chat-title">IEM-UEM Assistant</div>
                <div className="chat-subtitle">
                  {isSpeaking ? "Speaking..." : "Ask about the college & university"}
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              {ttsSupported && (
                <button
                  className="chat-icon-btn"
                  onClick={() => {
                    if (!isMuted) stopSpeaking();
                    setIsMuted((m) => !m);
                  }}
                  aria-label={isMuted ? "Unmute voice replies" : "Mute voice replies"}
                  title={isMuted ? "Unmute voice replies" : "Mute voice replies"}
                >
                  {isMuted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                    </svg>
                  )}
                </button>
              )}
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
                <div className={`chat-bubble ${m.role}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
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
              placeholder={isListening ? "Listening..." : "Ask a question about IEM-UEM..."}
              value={isListening ? transcript : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              readOnly={isListening}
            />
            {sttSupported && (
              <button
                className={`chat-mic-btn ${isListening ? "listening" : ""}`}
                onClick={() => (isListening ? stopListening() : startListening())}
                aria-label={isListening ? "Stop voice input" : "Ask by voice"}
                title={isListening ? "Stop voice input" : "Ask by voice"}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </svg>
              </button>
            )}
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
