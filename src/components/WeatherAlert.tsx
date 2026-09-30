import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Volume2 } from "lucide-react";
import type { RiskAssessment } from "@/types";

interface WeatherAlertProps {
  risk: RiskAssessment;
  message: string;
}

export default function WeatherAlert({
  risk,
  message,
}: WeatherAlertProps) {
  const [alertVisible, setAlertVisible] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (
      risk.level !== "high" &&
      risk.level !== "extreme"
    ) {
      return;
    }

    triggerAlert();
  }, [risk.level]);

  const playAlertSound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      const audioContext =
        audioContextRef.current ||
        new AudioContextClass();

      audioContextRef.current = audioContext;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.25,
        audioContext.currentTime
      );

      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
      }, 700);
    } catch (error) {
      console.error("Alert sound error:", error);
    }
  };

  const speakAlert = () => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
      `Weather alert. ${message}`
    );

    speech.lang = "en-IN";
    speech.rate = 0.9;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  const sendNotification = async () => {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      new Notification("🚨 Weather Alert", {
        body: message,
        icon: "/favicon.ico",
      });
    }
  };

  const triggerAlert = async () => {
    setAlertVisible(true);

    playAlertSound();
    speakAlert();
    await sendNotification();
  };

  if (!alertVisible) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-red-500 bg-red-50 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 text-red-600" />

        <div className="flex-1">
          <h3 className="font-bold text-red-700">
            🚨 Weather Alert
          </h3>

          <p className="mt-1 text-sm text-red-800">
            {message}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={playAlertSound}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
            >
              🔊 Test Sound
            </button>

            <button
              onClick={speakAlert}
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <Volume2 size={16} />
              Voice Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}