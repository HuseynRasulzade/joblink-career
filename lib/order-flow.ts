// The way an order is signed: the section head first, then the director. Whoever holds
// the order can approve it or send it back with a reason to the person before them
// (the director to the head, the head to whoever drew it up), who changes it and
// sends it on again.
export type FlowRole = "head" | "director";
export type FlowSigner = { role: FlowRole; title: string; name: string; approvedAt?: string; approvedBy?: string };
export type FlowEvent = { type: "created" | "approved" | "returned" | "edited" | "signed"; by: string; at: string; role?: string; to?: string; note?: string };
export type FlowHolder = FlowRole | "creator" | "";
export type FlowState = { signers: FlowSigner[]; status: "pending" | "returned" | "signed"; holder: FlowHolder; history: FlowEvent[] };

const firstOpen = (signers: FlowSigner[]): FlowHolder => signers.find((s) => !s.approvedAt)?.role || "";

export function startFlow(signers: FlowSigner[], by: string, at: string): FlowState {
  const clean = signers.map(({ role, title, name }) => ({ role, title, name }));
  return {
    signers: clean,
    status: clean.length ? "pending" : "signed",
    holder: clean.length ? clean[0].role : "",
    history: [{ type: "created", by, at }],
  };
}

// Orders saved before the flow existed have no holder: it is the first signer who has not approved.
export function normalizeFlow(state: Omit<FlowState, "holder" | "history"> & { holder?: FlowHolder; history?: FlowEvent[] }): FlowState {
  const signed = state.signers.length > 0 && state.signers.every((s) => s.approvedAt);
  return {
    signers: state.signers,
    status: signed ? "signed" : state.status,
    holder: state.holder || (signed ? "" : firstOpen(state.signers)),
    history: state.history || [],
  };
}

export function approveStep(state: FlowState, role: string, by: string, at: string): FlowState {
  if (state.status === "signed") throw new Error("Əmr artıq imzalanıb.");
  if (state.holder !== role) throw new Error("İndi bu əmr başqa şəxsin növbəsindədir.");
  const signers = state.signers.map((s) => (s.role === role ? { ...s, approvedAt: at, approvedBy: by } : s));
  const next = firstOpen(signers);
  const history: FlowEvent[] = [...state.history, { type: "approved", by, at, role }];
  if (!next) history.push({ type: "signed", by, at });
  return { signers, status: next ? "pending" : "signed", holder: next, history };
}

// The person before the holder: the head for the director, the creator for the head.
export function previousHolder(state: FlowState, role: string): FlowHolder {
  const index = state.signers.findIndex((s) => s.role === role);
  return index > 0 ? state.signers[index - 1].role : "creator";
}

export function returnStep(state: FlowState, role: string, by: string, at: string, reason: string): FlowState {
  if (state.status === "signed") throw new Error("İmzalanmış əmri geri göndərmək olmur.");
  if (state.holder !== role) throw new Error("İndi bu əmr başqa şəxsin növbəsindədir.");
  const note = reason.trim();
  if (note.length < 3) throw new Error("Geri göndərmə səbəbini yazın.");
  const to = previousHolder(state, role);
  // The person it goes back to, and everyone after them, must approve again.
  const from = to === "creator" ? 0 : state.signers.findIndex((s) => s.role === to);
  const signers = state.signers.map((s, i) => (i >= from ? { role: s.role, title: s.title, name: s.name } : s));
  return { signers, status: "returned", holder: to, history: [...state.history, { type: "returned", by, at, role, to, note }] };
}

// The creator changes the order: all approvals are cleared and it goes to the first signer again.
export function editStep(state: FlowState, signers: Omit<FlowSigner, "approvedAt" | "approvedBy">[], by: string, at: string): FlowState {
  if (state.status === "signed") throw new Error("İmzalanmış əmri dəyişmək olmur.");
  const clean = signers.map(({ role, title, name }) => ({ role, title, name }));
  return {
    signers: clean,
    status: clean.length ? "pending" : "signed",
    holder: clean.length ? clean[0].role : "",
    history: [...state.history, { type: "edited", by, at }],
  };
}

export const HOLDER_LABEL: Record<string, string> = { creator: "Əmri hazırlayan (HR)", head: "Şöbə rəhbəri", director: "Direktor", "": "" };
