export const POPULAR_MEDS = [
  "Paracetamol",
  "Ibuprofen",
  "Amoxicillin",
  "Cetirizine",
  "Aspirin",
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
];

export const DOSAGE_MEDICINES = [
  { value: "paracetamol", label: "Paracetamol", mgkg: 12.5, max: 4000 },
  { value: "ibuprofen", label: "Ibuprofen", mgkg: 8, max: 2400 },
  { value: "amoxicillin", label: "Amoxicillin", mgkg: 25, max: 3000 },
  { value: "cetirizine", label: "Cetirizine", mgkg: 0.25, max: 10 },
];

export const INTERACTION_MEDS = [
  "Paracetamol",
  "Ibuprofen",
  "Amoxicillin",
  "Cetirizine",
  "Aspirin",
  "Warfarin",
];

export const INTERACTIONS = {
  "aspirin|warfarin": {
    level: "danger",
    text: "High risk: combining Aspirin and Warfarin significantly increases bleeding risk. Avoid unless directed by a physician.",
  },
  "ibuprofen|aspirin": {
    level: "warn",
    text: "Moderate risk: both are NSAIDs/blood thinners and may increase stomach irritation and bleeding risk.",
  },
  "paracetamol|ibuprofen": {
    level: "success",
    text: "Generally safe: these are commonly used together for pain relief, as they work through different mechanisms.",
  },
  "amoxicillin|cetirizine": {
    level: "success",
    text: "No known significant interaction between these two medicines.",
  },
};

export const KB = [
  {
    name: "Paracetamol",
    use: "Pain relief & fever reducer.",
    dose: "500–1000mg every 4–6h, max 4000mg/day.",
    warn: "Avoid with liver disease or heavy alcohol use.",
  },
  {
    name: "Ibuprofen",
    use: "Anti-inflammatory pain relief.",
    dose: "200–400mg every 6–8h, max 2400mg/day.",
    warn: "Take with food; avoid with stomach ulcers.",
  },
  {
    name: "Amoxicillin",
    use: "Antibiotic for bacterial infections.",
    dose: "250–500mg every 8h as prescribed.",
    warn: "Complete the full course even if feeling better.",
  },
  {
    name: "Cetirizine",
    use: "Antihistamine for allergies.",
    dose: "10mg once daily.",
    warn: "May cause mild drowsiness.",
  },
  {
    name: "Aspirin",
    use: "Pain relief & blood thinner.",
    dose: "As prescribed by physician.",
    warn: "Avoid in children under 16 (Reye's syndrome risk).",
  },
];
