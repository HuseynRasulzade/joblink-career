// The status of an application follows what happens to it: the employer opens a new application, an interview falls through,
// the interview ends with a «reject» opinion. (Inviting to an interview, offers, tests and withdrawing already move it.)
export type ApplicationFlowEvent = "viewed" | "interview-cancelled" | "interview-declined" | "interview-no-show" | "feedback-reject";
export type FlowContext = { activeInterviews: number; completedInterviews: number; pendingOffer: boolean };

// The status the application should move to, or null when it stays where it is.
export function statusAfter(event: ApplicationFlowEvent, current: string, ctx: FlowContext): string | null {
  if (event === "viewed") return current === "Göndərildi" ? "Baxışda" : null;
  if (current !== "Müsahibə" || ctx.pendingOffer) return null;
  if (event === "feedback-reject") return "Uyğun deyil";
  // The interview did not happen: back to review, unless another interview is still planned or one was already held.
  return ctx.activeInterviews === 0 && ctx.completedInterviews === 0 ? "Baxışda" : null;
}

// The status an employer may move an application to by hand. The statuses that stand for a document or a stage are reached only
// through their own action: «Müsahibə» through an invitation or a scheduled interview, «Təklif edildi» through the offer, and a
// hire only after an interview (or when the offer is accepted). Closing is always possible while the application is open.
export type ManualMove = { ok: true } | { ok: false; message: string };
const OPEN = ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi"];
export function manualStatusMove(from: string, to: string): ManualMove {
  if (from === to) return { ok: true };
  if (to === "Uyğun deyil") return OPEN.includes(from) ? { ok: true } : { ok: false, message: "Bu müraciət artıq yekunlaşıb." };
  if (to === "Baxışda") return ["Göndərildi", "Müsahibə", "Uyğun deyil"].includes(from) ? { ok: true } : { ok: false, message: "Bu müraciəti baxışa qaytarmaq olmaz." };
  if (to === "Müsahibə") return ["Göndərildi", "Baxışda", "Uyğun deyil"].includes(from) ? { ok: true } : { ok: false, message: "Müsahibə mərhələsinə müsahibəyə dəvət və ya müsahibə təyin etməklə keçilir." };
  if (to === "Təklif edildi") return { ok: false, message: "Bu statusa “İş təklifi et” əməliyyatı ilə keçilir: təklif sənədi yaradılır və namizədə göndərilir." };
  if (to === "İşə qəbul edildi") return ["Müsahibə", "Təklif edildi"].includes(from) ? { ok: true } : { ok: false, message: "İşə qəbul müsahibə mərhələsindən sonra mümkündür. Əvvəl namizədi müsahibəyə dəvət edin." };
  return { ok: false, message: "Bu statusa əl ilə keçmək olmaz." };
}
