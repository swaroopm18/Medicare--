import { PROJECT_BRIEF, SUBJECTS } from "../data/subjectData.js";

export default function SubjectIntegration() {
  return (
    <div className="card" style={{ marginTop: "var(--sp-3)" }}>
      <div className="card-head">
        <h3>Where Your Coursework Shows Up</h3>
        <span className="pill-tag tone-blue">{PROJECT_BRIEF.code}</span>
      </div>
      <p style={{ color: "var(--muted)", marginTop: -6, marginBottom: 14, fontSize: 13.5 }}>
        MediCare is built in the spirit of the "{PROJECT_BRIEF.title}" brief — a full working system around
        the same subject mapping, rather than a console-only version.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {PROJECT_BRIEF.chips.map((c) => (
          <span className="meta-pill" key={c.label}><b>{c.label}:</b> {c.value}</span>
        ))}
      </div>

      <div className="subject-grid">
        {SUBJECTS.map((s) => (
          <div className="subject-card" key={s.key}>
            <div className="subject-card-head">
              <h4>{s.name}</h4>
              <span className={`pill-tag ${s.tone}`} style={{ flexShrink: 0 }}>{s.code}</span>
            </div>
            <p className="subject-card-tagline">{s.tagline}</p>
            {s.topics.map((t) => (
              <details className="subject-topic" key={t.title}>
                <summary>{t.title}</summary>
                <div className="subject-topic-body">
                  <span className="subject-topic-ref">{t.ref}</span>
                  <p className="subject-topic-text">{t.text}</p>
                  <div className="subject-topic-used"><b>In MediCare:</b> {t.used}</div>
                </div>
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
