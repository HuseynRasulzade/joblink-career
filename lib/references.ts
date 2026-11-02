// A reference check: the questions put to a person the candidate named, and what they add up to.
export const REFERENCE_QUESTIONS: { id: string; label: string; kind: "scale5" | "yesno" | "text" }[] = [
  { id: "relation", label: "Namizədi nə qədər müddət və hansı vəzifədə tanıyırsınız?", kind: "text" },
  { id: "results", label: "İş nəticələri (1–5)", kind: "scale5" },
  { id: "teamwork", label: "Komanda ilə işləmə (1–5)", kind: "scale5" },
  { id: "reliability", label: "Etibarlılıq və məsuliyyət (1–5)", kind: "scale5" },
  { id: "strengths", label: "Ən güclü tərəfləri", kind: "text" },
  { id: "growth", label: "İnkişaf etdirməli olduğu sahələr", kind: "text" },
  { id: "rehire", label: "Yenidən işə götürərdinizmi?", kind: "yesno" },
];
export function cleanReferenceAnswers(raw: unknown): Record<string, string> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of REFERENCE_QUESTIONS) {
    const v = String(o[q.id] ?? "").trim().slice(0, q.kind === "text" ? 800 : 10);
    if (!v) continue;
    if (q.kind === "scale5" && !/^[1-5]$/.test(v)) continue;
    if (q.kind === "yesno" && !["yes", "no"].includes(v)) continue;
    out[q.id] = v;
  }
  return out;
}
// The mean of the 1–5 answers and a plain reading of it.
export function referenceScore(answers: Record<string, string>) {
  const scores = REFERENCE_QUESTIONS.filter((q) => q.kind === "scale5").map((q) => Number(answers[q.id])).filter((n) => n >= 1 && n <= 5);
  if (!scores.length) return { score: null as number | null, reading: "" };
  const score = Math.round((scores.reduce((t, n) => t + n, 0) / scores.length) * 100) / 100;
  const reading = answers.rehire === "no" ? "Yenidən işə götürməzdi: diqqətlə yoxlayın." : score >= 4 ? "Müsbət rəy" : score >= 3 ? "Orta rəy" : "Zəif rəy";
  return { score, reading };
}
export const REFERRAL_STATUS: Record<string, string> = { new: "Yeni", contacted: "Əlaqə saxlanılıb", interview: "Müsahibə", hired: "İşə qəbul olunub", rejected: "Uyğun gəlmədi" };
