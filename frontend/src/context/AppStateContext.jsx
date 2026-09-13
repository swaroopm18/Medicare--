import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { todayStr, scheduledTimestamp } from "../utils/helpers.js";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../services/api.js";

const AppStateContext = createContext(null);

const CONFIG = {
  REMINDER_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes — real interval per spec
  TEST_INTERVAL_MS: 15 * 1000, // used only if Test Mode is enabled
  TICK_MS: 5000, // scheduler check frequency
};

const defaultState = {
  medicines: [], 
  reminders: {}, 
  history: [], 
  darkMode: false,
  soundEnabled: true,
  testMode: false,
  recentSearches: [],
};

function storageKeyFor(userId) {
  return `medicare_state_v1_${userId || "guest"}`;
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    if (raw) return Object.assign({}, defaultState, JSON.parse(raw));
  } catch (e) {
    console.warn("State load failed", e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function groupBackendMedicines(list) {
  const groups = {};
  const order = [];
  for (const m of list) {
    const key = `${m.name}||${m.dosage_amount}||${m.meal_timing}`;
    if (!groups[key]) {
      groups[key] = {
        id: key,
        name: m.name,
        dosage: m.dosage_amount,
        meal: m.meal_timing,
        times: [],
        _backendTimes: {},
        createdAt: Date.now(),
      };
      order.push(key);
    }
    groups[key].times.push(m.time);
    groups[key]._backendTimes[m.time] = m.id;
  }
  return order.map((k) => groups[k]);
}

export function AppStateProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id || "guest";

  const stateRef = useRef(loadState(userId));
  const [, bump] = useReducer((x) => x + 1, 0);
  const [activeReminderKey, setActiveReminderKey] = useState(null);

  useEffect(() => {
    stateRef.current = loadState(userId);
    bump();
    refreshMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function persist() {
    try {
      localStorage.setItem(storageKeyFor(userId), JSON.stringify(stateRef.current));
    } catch (e) {
      console.warn("State save failed", e);
    }
    bump();
  }

  async function refreshMedicines() {
    try {
      const list = await api.medicines.list();
      stateRef.current.medicines = groupBackendMedicines(list);
      persist();
    } catch (e) {
      console.warn("Could not load medicines from server", e);
      toast("Couldn't reach the server — showing your last saved medicines.", "warn");
    }
  }

  async function addMedicine({ name, dosage, meal, times }) {
    try {
      for (const time of times) {
        await api.medicines.create({
          name,
          dosage_amount: dosage,
          meal_timing: meal,
          time,
          frequency_per_day: times.length,
        });
      }
      await refreshMedicines();
      toast("Medicine added — reminders scheduled.", "success");
    } catch (e) {
      toast(e.message || "Couldn't add that medicine.", "error");
    }
  }

  async function updateMedicine(id, { name, dosage, meal, times }) {
    const med = stateRef.current.medicines.find((m) => m.id === id);
    const backendTimes = med?._backendTimes || {};
    const oldTimes = Object.keys(backendTimes);
    const newTimes = times.slice();

    try {
      for (const t of oldTimes) {
        if (!newTimes.includes(t)) {
          await api.medicines.remove(backendTimes[t]);
        }
      }
      for (const t of oldTimes) {
        if (newTimes.includes(t)) {
          await api.medicines.update(backendTimes[t], {
            name,
            dosage_amount: dosage,
            meal_timing: meal,
            frequency_per_day: newTimes.length,
          });
        }
      }
      for (const t of newTimes) {
        if (!oldTimes.includes(t)) {
          await api.medicines.create({
            name,
            dosage_amount: dosage,
            meal_timing: meal,
            time: t,
            frequency_per_day: newTimes.length,
          });
        }
      }
      await refreshMedicines();
      toast("Medicine updated.", "success");
    } catch (e) {
      toast(e.message || "Couldn't update that medicine.", "error");
    }
  }

  async function deleteMedicine(id) {
    const med = stateRef.current.medicines.find((m) => m.id === id);
    const backendIds = Object.values(med?._backendTimes || {});
    try {
      for (const bId of backendIds) {
        await api.medicines.remove(bId);
      }
      stateRef.current.medicines = stateRef.current.medicines.filter((m) => m.id !== id);
      Object.keys(stateRef.current.reminders).forEach((k) => {
        if (stateRef.current.reminders[k].medId === id) delete stateRef.current.reminders[k];
      });
      persist();
      toast("Medicine removed.", "success");
    } catch (e) {
      toast(e.message || "Couldn't remove that medicine.", "error");
    }
  }

  function addRecentSearch(val) {
    if (!stateRef.current.recentSearches.includes(val)) {
      stateRef.current.recentSearches.unshift(val);
      stateRef.current.recentSearches = stateRef.current.recentSearches.slice(0, 6);
      persist();
    }
  }
  function clearRecentSearches() {
    stateRef.current.recentSearches = [];
    persist();
  }

  function toggleDarkMode() {
    stateRef.current.darkMode = !stateRef.current.darkMode;
    persist();
    api.auth.updatePreferences({ dark_mode: stateRef.current.darkMode }).catch(() => {});
  }
  function setSoundEnabled(val) {
    stateRef.current.soundEnabled = val;
    persist();
    api.auth.updatePreferences({ medicine_alarm_sound: val }).catch(() => {});
  }

  function intervalMs() {
    return stateRef.current.testMode ? CONFIG.TEST_INTERVAL_MS : CONFIG.REMINDER_INTERVAL_MS;
  }

  function logHistory(r, action) {
    const med = stateRef.current.medicines.find((m) => m.id === r.medId);
    stateRef.current.history.push({
      medId: r.medId,
      name: med ? med.name : "Medicine",
      date: r.date,
      time: r.time,
      action,
      at: Date.now(),
    });
    if (stateRef.current.history.length > 300) {
      stateRef.current.history = stateRef.current.history.slice(-300);
    }
    const backendId = med?._backendTimes?.[r.time];
    if (backendId) {
      api.medicines.doseAction({ medicine_id: backendId, action }).catch(() => {});
    }
  }

  function schedulerTick() {
    if (activeReminderKey) return; // one at a time
    const now = Date.now();
    const today = todayStr();

    // 1) Create "due" entries for scheduled times
    stateRef.current.medicines.forEach((med) => {
      med.times.forEach((time) => {
        const key = `${med.id}_${today}_${time}`;
        if (!stateRef.current.reminders[key]) {
          const ts = scheduledTimestamp(today, time);
          if (now >= ts) {
            stateRef.current.reminders[key] = {
              medId: med.id,
              date: today,
              time,
              status: "due",
              snoozeCount: 0,
              skipUsed: false,
              nextFireAt: ts,
            };
            console.log("Created reminder", key);
          }
        }
      });
    });

    // 2) Find earliest pending entry whose nextFireAt has arrived
    const candidates = Object.entries(stateRef.current.reminders)
      .filter(([, r]) => (r.status === "due" || r.status === "waiting_response") && r.nextFireAt <= now)
      .sort((a, b) => a[1].nextFireAt - b[1].nextFireAt);

    if (candidates.length) {
      console.log("Candidates:", candidates);
      persist();
      const targetKey = candidates[0][0];
      setActiveReminderKey(targetKey);
      const r = stateRef.current.reminders[targetKey];
      r.status = "showing";
      persist();
    }
  }

  useEffect(() => {
    const id = setInterval(schedulerTick, CONFIG.TICK_MS);
    schedulerTick();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    document.body.setAttribute("data-theme", stateRef.current.darkMode ? "dark" : "light");
  });

  function getActiveReminder() {
    const key = activeReminderKey;
    if (!key) return null;
    const r = stateRef.current.reminders[key];
    if (!r) return null;
    const med = stateRef.current.medicines.find((m) => m.id === r.medId);
    if (!med) {
      delete stateRef.current.reminders[key];
      setActiveReminderKey(null);
      persist();
      return null;
    }
    return { key, reminder: r, medicine: med };
  }

  function handleReminderAction(action) {
    const key = activeReminderKey;
    if (!key) return;
    const r = stateRef.current.reminders[key];
    if (!r) return;

    if (action === "taken") {
      r.status = "taken";
      logHistory(r, "taken");
      toast(`Marked as taken. Well done! 💊`, "success");
    } else if (action === "skip") {
      if (!r.skipUsed) {
        r.skipUsed = true;
        r.status = "waiting_response";
        r.nextFireAt = Date.now() + intervalMs();
        logHistory(r, "skipped");
        toast(`Skipped — I'll remind you once more in ${stateRef.current.testMode ? "15s" : "10 minutes"}.`, "warn");
      } else {
        r.status = "skipped-final";
        logHistory(r, "skipped");
        toast(`Skipped. No further reminders for this dose.`, "warn");
      }
    } else if (action === "snooze") {
      r.snoozeCount = (r.snoozeCount || 0) + 1;
      r.status = "waiting_response";
      r.nextFireAt = Date.now() + intervalMs();
      logHistory(r, "snoozed");
      toast(`Snoozed — I'll remind you again in ${stateRef.current.testMode ? "15s" : "10 minutes"}.`, "warn");
    }
    setActiveReminderKey(null);
    persist();
    setTimeout(schedulerTick, 300);
  }

  const value = useMemo(
    () => ({
      state: stateRef.current,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      addRecentSearch,
      clearRecentSearches,
      toggleDarkMode,
      setSoundEnabled,
      getActiveReminder,
      handleReminderAction,
      refreshMedicines,
      persist,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stateRef.current, userId, activeReminderKey]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}