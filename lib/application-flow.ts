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
