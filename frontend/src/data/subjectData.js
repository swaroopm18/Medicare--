// Maps the app's engineering back to the R23 syllabus subjects it was built from.
// Rendered on the Dashboard as a low-key "how this maps to your coursework" section.

export const PROJECT_BRIEF = {
  title: "Medicine Reminder with Dosage Calculator",
  code: "Project 15",
  chips: [
    { label: "R23 alignment", value: "Sem-I Electrical + Sem-II Chemistry" },
    { label: "Combined subjects", value: "Basic Electrical + Programming + Engineering Chemistry" },
    { label: "AI/LLM layer", value: "Validates dosage from weight/age rules" },
    { label: "Coding framework", value: "Python + Time module + Validation logic" },
  ],
};

export const SUBJECTS = [
  {
    key: "programming",
    name: "Introduction to Programming",
    code: "R231107",
    tagline: "Variables, control structures, functions, arrays and strings — the backbone of every module in this codebase.",
    tone: "tone-blue",
    topics: [
      {
        title: "Variables, Data Types & Operators",
        ref: "Unit I — Constants, variables, data types, operators and expressions",
        text: "Every field in the app — a medicine's dosage amount, a user's weight, a reminder's timestamp — is a typed variable, combined using the same core arithmetic and comparison operators.",
        used: "User, Medicine, Reminder and DosageLog fields; all dosage-engine arithmetic (weight × mg-per-kg, BSA formula).",
        modules: "models.py, services/dosage_engine.py",
      },
      {
        title: "Decision-Making & Control Structures",
        ref: "Unit II — if/else, else-if ladder, switch, loops",
        text: "Almost every safety rule in MediCare is an if/else chain: if total dose exceeds the max, flag it; if age is under 2, add a pediatric warning.",
        used: "validate_medicine_dose() and safety-check functions; intent-matching in the AI assistant; reminder status transitions.",
        modules: "services/dosage_engine.py, services/ai_assistant.py, services/scheduler.py",
      },
      {
        title: "Loops & Iteration",
        ref: "Unit II — while, do-while, for, nested loops",
        text: "The reminder scheduler walks every active medicine, then every time-of-day for that medicine — a direct nested-loop problem.",
        used: "_ensure_todays_reminders() iterates medicines, then each medicine's times_of_day list.",
        modules: "services/scheduler.py",
      },
      {
        title: "Functions & Modular Programming",
        ref: "Reusable, modular logic",
        text: "Dosage calculation, OCR parsing, notifications and report analysis are each written as small, single-purpose, independently testable functions rather than one long script.",
        used: "The whole services/ package is organized as separate function-level modules.",
        modules: "services/",
      },
      {
        title: "Arrays, Lists & Strings",
        ref: "Unit III — one-dimensional arrays, string handling functions",
        text: "Reminder times are stored as a list; OCR'd prescription text is parsed line-by-line with string operations; an allergy list is split and matched against a medicine name.",
        used: "Medicine.times_of_day (JSON list); parsing in ocr_service.py and report_analyzer.py; allergy matching in dosage_engine.py.",
        modules: "services/ocr_service.py, services/report_analyzer.py",
      },
    ],
  },
  {
    key: "electrical",
    name: "Basic Electrical & Electronics Engineering",
    code: "R231109",
    tagline: "Circuit protection and threshold-based safety devices, reapplied as software safety checks.",
    tone: "tone-amber",
    topics: [
      {
        title: "Ohm's Law & Circuit Limits",
        ref: "Unit I — Ohm's Law and its limitations; series/parallel circuit limits",
        text: "Exceeding a rated current/voltage limit in a circuit triggers protection. A maximum daily dose acts exactly like a rated circuit limit — cross it, and a protective warning fires instead of silent failure.",
        used: "max_daily_mg threshold check — the software equivalent of a circuit's rated limit.",
        modules: "services/dosage_engine.py",
      },
      {
        title: "Protection Devices (Fuses, MCB, ELCB)",
        ref: "Unit IV — Fuses, MCB, ELCB/RCCB, electrical safety measures",
        text: "A fuse doesn't stop a problem from existing — it detects an unsafe condition and interrupts before harm occurs. The dosage validator and missed-dose detector play this same role.",
        used: "validate_medicine_dose() warnings act as a 'fuse'; _mark_missed_reminders() acts as a 'trip' for a neglected reminder.",
        modules: "services/dosage_engine.py, services/scheduler.py",
      },
    ],
  },
  {
    key: "chemistry",
    name: "Engineering Chemistry",
    code: "R23 1-2 Common",
    tagline: "Concentration, reference ranges and calibration — the same reasoning used for lab-value and liquid-dose calculations.",
    tone: "tone-green",
    topics: [
      {
        title: "Concentration & Quantitative Estimation",
        ref: "Unit I — Estimation of hardness of water (EDTA method), quantitative water-quality analysis",
        text: "Chemistry teaches concentration as amount-per-volume. MediCare's liquid-dosage conversion is the same math applied to medicine: given mg/mL, compute the mL for a target mg dose.",
        used: "The concentration_mg_per_ml → dose_ml conversion in the dosage engine's safety checks.",
        modules: "services/dosage_engine.py",
      },
      {
        title: "Reference Ranges & Deviation Analysis",
        ref: "Unit I/V — BIS/WHO standards for water quality vs. measured values",
        text: "Chemistry compares a measured value against an accepted reference range to judge acceptability. The report analyzer applies the identical logic to lab results like glucose or cholesterol.",
        used: "LAB_REFERENCE_RANGES comparison logic, flagging a value as low / high / normal.",
        modules: "services/report_analyzer.py",
      },
      {
        title: "Chemical / Drug Safety Awareness",
        ref: "General course theme — safety in handling chemical substances",
        text: "Engineering Chemistry builds the habit of handling substances with documented precautions. MediCare extends that habit to medicines as chemical substances a patient consumes.",
        used: "CONDITION_PRECAUTIONS text and allergy-name-matching checks.",
        modules: "services/report_analyzer.py, services/dosage_engine.py",
      },
    ],
  },
];
