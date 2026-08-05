import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface PresenceOptions {
  /** How often to run detection (ms) -- lower = more responsive, more CPU */
  detectionIntervalMs?: number;
  /** Detector confidence threshold (0-1) */
  minConfidence?: number;
  /**
   * Consecutive missed detections required before reporting "face gone".
   * Absorbs blinks / brief head turns without flickering presence off.
   */
  missesBeforeAbsent?: number;
  /** Called every time the (debounced) presence value changes */
  onPresenceChange: (present: boolean) => void;
}

interface PresenceState {
  status: "idle" | "loading-models" | "requesting-camera" | "watching" | "denied" | "error";
  errorMessage?: string;
}

/**
 * Acquires the webcam ONCE and keeps it running for the lifetime of the
 * component -- it is never stopped/restarted as the chat opens and closes,
 * so the browser never re-prompts for camera permission mid-session.
 *
 * Reports a debounced boolean "is a face currently present" signal via
 * onPresenceChange. No video/image data ever leaves the browser.
 *
 * Usage:
 *   const { videoRef } = usePresenceDetection({
 *     onPresenceChange: (present) => { ... },
 *   });
 *   // mount a <video ref={videoRef} /> somewhere invisible/off-screen
 */
export function usePresenceDetection({
  detectionIntervalMs = 350,
  minConfidence = 0.35,
  missesBeforeAbsent = 2,
  onPresenceChange,
}: PresenceOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<PresenceState>({ status: "idle" });

  const currentlyPresentRef = useRef(false);
  const consecutiveMissesRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onPresenceChangeRef = useRef(onPresenceChange);
  onPresenceChangeRef.current = onPresenceChange;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setState({ status: "loading-models" });
        const MODEL_URL = "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (cancelled) return;

        setState({ status: "requesting-camera" });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setState({ status: "watching" });

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: minConfidence,
        });

        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;

          const result = await faceapi.detectSingleFace(videoRef.current, detectorOptions);
          const faceDetectedThisFrame = !!result;

          if (faceDetectedThisFrame) {
            consecutiveMissesRef.current = 0;
            if (!currentlyPresentRef.current) {
              currentlyPresentRef.current = true;
              onPresenceChangeRef.current(true);
            }
          } else {
            consecutiveMissesRef.current += 1;
            if (currentlyPresentRef.current && consecutiveMissesRef.current >= missesBeforeAbsent) {
              currentlyPresentRef.current = false;
              onPresenceChangeRef.current(false);
            }
          }
        }, detectionIntervalMs);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied"
            : err instanceof Error
            ? err.message
            : "Unknown camera/model error";
        setState({
          status: err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error",
          errorMessage: message,
        });
      }
    }

    start();

    // Camera + detection loop run for the lifetime of the mounted widget --
    // only torn down on unmount, never on open/close, so permission is only
    // ever requested once per page load.
    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, videoRef };
}
