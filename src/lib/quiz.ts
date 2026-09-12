// Assessment quiz bank across module types.
export interface QuizQuestion {
  id: string;
  type: "MCQ" | "True/False" | "Scenario" | "Architecture" | "Wireless" | "Trade-off";
  prompt: string;
  options: string[];
  answer: number; // index
  explanation: string;
}

export const QUIZ: QuizQuestion[] = [
  { id: "q1", type: "Architecture", prompt: "Which stage comes immediately AFTER 'ADC / Sampling' in the telemetry pipeline?", options: ["Signal Conditioning", "MCU / Edge Processing", "Wireless Communication", "Gateway"], answer: 1, explanation: "The canonical pipeline is Physical → Sensor → Conditioning → ADC → MCU → Wireless → Gateway → Cloud → Dashboard." },
  { id: "q2", type: "MCQ", prompt: "To digitise a signal with a 40 Hz bandwidth without aliasing, the minimum sampling rate is:", options: ["40 Hz", "60 Hz", "80 Hz", "20 Hz"], answer: 2, explanation: "Nyquist requires sampling above 2× the bandwidth → > 80 Hz." },
  { id: "q3", type: "True/False", prompt: "A single wavelength of light is sufficient to compute SpO₂.", options: ["True", "False"], answer: 1, explanation: "SpO₂ needs two wavelengths (red + IR) to separate oxy- and deoxy-haemoglobin via the ratio-of-ratios." },
  { id: "q4", type: "Wireless", prompt: "For a battery wearable streaming to a nearby phone, the most appropriate radio is:", options: ["Wi-Fi", "Cellular", "BLE", "LoRa"], answer: 2, explanation: "BLE is low-power and short-range — ideal for wearables near a hub." },
  { id: "q5", type: "Wireless", prompt: "For a vaccine cold-chain tag tracked across a city, the best fit is:", options: ["NFC", "BLE", "LoRa / Cellular", "Zigbee"], answer: 2, explanation: "Wide-area tracking needs long range and tiny data rate — LoRa (or Cellular) fits." },
  { id: "q6", type: "Trade-off", prompt: "Which change most extends battery life for a telemetry node?", options: ["Higher transmit power", "Lower duty cycle (more sleep)", "Higher sampling rate", "Larger packets"], answer: 1, explanation: "Average current — dominated by how often the radio wakes — sets battery life; more sleep = longer life." },
  { id: "q7", type: "Scenario", prompt: "An ECG trace shows a steady 50 Hz ripple on the baseline. The most likely cause is:", options: ["Motion artifact", "Powerline interference", "Sensor drift", "Packet loss"], answer: 1, explanation: "A steady sinusoidal ripple at mains frequency indicates 50/60 Hz powerline interference — use a notch filter." },
  { id: "q8", type: "MCQ", prompt: "Sending only extracted features instead of raw samples primarily:", options: ["Increases the data rate", "Reduces data rate and radio energy", "Improves sensor accuracy", "Removes the need for an ADC"], answer: 1, explanation: "Edge feature extraction slashes the data that must be transmitted, saving bandwidth and radio energy." },
];

export function gradeQuiz(answers: Record<string, number>): { correct: number; total: number; percent: number } {
  const total = QUIZ.length;
  const correct = QUIZ.filter((q) => answers[q.id] === q.answer).length;
  return { correct, total, percent: Math.round((correct / total) * 100) };
}
