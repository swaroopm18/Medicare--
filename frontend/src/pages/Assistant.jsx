import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { IconSend } from "../components/Icons.jsx";

const SUGGESTIONS = [
  { q: "What time should I take my medicines today?", label: "Today's schedule?" },
  { q: "Can I take paracetamol and ibuprofen together?", label: "Paracetamol + Ibuprofen?" },
  { q: "What should I do if I miss a dose?", label: "Missed a dose" },
];

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const logRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        const history = await api.assistant.history();
        if (history.length) {
          const hydrated = history.flatMap((h) => [
            { who: "user", text: h.message },
            { who: "bot", text: h.reply },
          ]);
          setMessages(hydrated);
          return;
        }
      } catch {
        // fall through to the canned greeting below if history can't be loaded
      }
      const firstName = (user?.name || "there").split(" ")[0];
      setMessages([{ who: "bot", text: `Hi ${firstName}! I'm your MediCare AI Assistant. Ask me about your schedule, dosages, or medicine interactions.` }]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, typing]);

  async function send(text) {
    const val = text.trim();
    if (!val) return;
    setMessages((m) => [...m, { who: "user", text: val }]);
    setTyping(true);
    try {
      const res = await api.assistant.chat(val);
      setMessages((m) => [...m, { who: "bot", text: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { who: "bot", text: e.message || "Sorry, I couldn't reach the assistant just now." }]);
    } finally {
      setTyping(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <section className="page active">
      <div className="page-head">
        <div><span className="eyebrow">AI Health Assistant</span><h1>Ask MediCare AI</h1><p>Get quick guidance on medicines, dosages and general health questions.</p></div>
      </div>
      <div className="card chat-wrap">
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => <div className={`msg ${m.who}`} key={i}>{m.text}</div>)}
          {typing && (
            <div className="msg bot"><span className="typing"><span></span><span></span><span></span></span></div>
          )}
        </div>
        <div className="chat-suggestions">
          {SUGGESTIONS.map((s) => (
            <button className="chip-btn" key={s.q} onClick={() => send(s.q)} type="button">{s.label}</button>
          ))}
        </div>
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input type="text" className="input" placeholder="Type your health question…" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn btn-primary" type="submit" aria-label="Send message"><IconSend /></button>
        </form>
      </div>
    </section>
  );
}
