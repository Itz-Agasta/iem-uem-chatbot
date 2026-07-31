export const topTickerItems: string[] = [
  "NAAC A+ Accredited Institution",
  "Ranked among Top Engineering Colleges in Eastern India — NIRF 2025",
  "ISO 9001:2015 Certified",
  "AICTE Approved | Affiliated to MAKAUT",
  "12+ Prizes at Time Now Conclave (East 2026)",
  "Winner — ET Now Business Summit & Awards, West Bengal",
];

export const bottomTickerItems: string[] = [
  "Placement Drive: TCS, Infosys, Wipro on campus this week",
  "IEEE Student Branch Chapter inaugurated — ECE Department",
  "Research publications up 18% this academic year (SCI/SCOPUS)",
  "Annual Tech Fest 'Concept 2026' registrations now open",
  "New MoU signed with industry partners for internship pipeline",
  "Alumni Meet 2026 — Save the Date: 15th September",
];

export const todayEvent = {
  title: "Guest Lecture: AI in Modern Engineering",
  subtitle: "Auditorium Hall 2 · 11:00 AM – 1:00 PM",
  imageUrl:
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1600&auto=format&fit=crop",
};

// Mocked backend responses -- swap ChatWidget's `mockAsk` for a real
// fetch() call to your FastAPI backend once it's ready.
export const mockQA: { match: string[]; answer: string }[] = [
  {
    match: ["achievement", "38th", "academic council"],
    answer:
      "In the 38th Academic Council Meeting (27th Feb 2026), IEM-UEM Group won 12 prizes at the Time Now Conclave (East 2026), won the ET Now Business Summit & Awards (West Bengal), and inaugurated new IEEE Student Branch Chapters across departments, alongside strong SCI/SCOPUS publication output across BSH, CSE, ECE, CST and other departments.",
  },
  {
    match: ["vision", "mission"],
    answer:
      "UEM Kolkata's vision is to be a globally recognized institution known for outcome-based education and application-oriented research. Its mission focuses on practical, socially responsible learning and continuous upgrades to teaching quality and infrastructure.",
  },
  {
    match: ["placement"],
    answer:
      "This week's placement drive includes TCS, Infosys, and Wipro visiting campus. For full schedules, check the placement cell notice board or ask at the front desk.",
  },
  {
    match: ["admission"],
    answer:
      "For admissions information, please visit the admissions office near the main gate, or check the official IEM-UEM website. I can help with questions about achievements, events, and academic council reports in the meantime.",
  },
];

export const defaultFallback =
  "I don't have information about that in the documents I have access to. I can only answer questions about IEM/UEM based on official records.";
