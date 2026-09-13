import { useEffect, useRef, useState } from "react";
import { useAppState } from "../context/AppStateContext.jsx";
import { fmtTime12 } from "../utils/helpers.js";
import { IconMute, IconPillAlarm, IconClock, IconMeal, IconMedicines, IconCheck, IconClose } from "./Icons.jsx";

export default function ReminderModal() {
  const { state, getActiveReminder, handleReminderAction } = useAppState();
  const active = getActiveReminder();
  console.log("ReminderModal render:", active);
  const [muted, setMuted] = useState(false);

  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  function ensureAudioCtx() {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  useEffect(() => {
    const unlock = () => ensureAudioCtx();
    ["click", "keydown", "touchstart"].forEach((evt) => document.addEventListener(evt, unlock, { once: true, passive: true }));
    return () => ["click", "keydown", "touchstart"].forEach((evt) => document.removeEventListener(evt, unlock));
  }, []);

  function beep() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [[880, 0], [660, 0.16]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.28, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.16);
    });
  }

  function stopAlarmLoop() {
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
  }
  function startAlarmLoop() {
    stopAlarmLoop();
    if (!state.soundEnabled || muted) return;
    beep();
    alarmIntervalRef.current = setInterval(() => { if (state.soundEnabled && !muted) beep(); }, 1000);
  }

  useEffect(() => {
    if (active) {
      setMuted(false);
      document.body.style.overflow = "hidden";
      startAlarmLoop();
    } else {
      stopAlarmLoop();
    }
    return stopAlarmLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key]);

  useEffect(() => {
    if (muted) stopAlarmLoop(); else if (active) startAlarmLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  if (!active) return null;
  const { reminder: r, medicine: med } = active;

  return (
    <div className="reminder-backdrop open" role="alertdialog" aria-modal="true">
      <div className={`reminder-card${muted ? " muted" : ""}`}>
        <button className="reminder-mute" aria-label="Mute alarm sound" title={muted ? "Unmute alarm" : "Mute sound"} onClick={() => setMuted((m) => !m)} type="button">
          <IconMute />
        </button>
        <span className="reminder-eyebrow">Medicine Reminder</span>
        <div className="pulse-wrap">
          <span className="pulse-ring"></span><span className="pulse-ring r2"></span><span className="pulse-ring r3"></span>
          <span className="pulse-icon"><IconPillAlarm /></span>
        </div>
        <div className="reminder-medname">{med.name}</div>
        <div className="reminder-title">
          Time to take your medicine
          <span className="sound-bars"><span></span><span></span><span></span><span></span></span>
        </div>
        <div className="reminder-info-row">
          <span className="info-pill"><IconClock /><span>{fmtTime12(r.time)}</span></span>
          <span className="info-pill"><IconMeal /><span>{med.meal}</span></span>
          <span className="info-pill"><IconMedicines /><span>{med.dosage}</span></span>
        </div>
        {(r.snoozeCount > 0 || r.skipUsed) && (
          <div className="snooze-note">
            {r.snoozeCount > 0
              ? `Snoozed ${r.snoozeCount} time${r.snoozeCount > 1 ? "s" : ""} already — you can keep snoozing as needed.`
              : `This is your one follow-up reminder after skipping.`}
          </div>
        )}
        <div className="reminder-actions">
          <button className="btn btn-success btn-block" onClick={() => handleReminderAction("taken")} type="button">
            <IconCheck /> Taken
          </button>
          <div className="reminder-secondary-row">
            <button className="btn btn-secondary" onClick={() => handleReminderAction("snooze")} type="button">
              <IconClock /> Snooze 10m
            </button>
            <button className="btn btn-ghost" style={{ border: "1px solid var(--border)", height: 48, borderRadius: "var(--r-md)" }} onClick={() => handleReminderAction("skip")} type="button">
              <IconClose /> Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
