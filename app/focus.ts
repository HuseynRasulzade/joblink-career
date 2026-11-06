// A one-shot hand-over between screens: the screen that links somewhere says exactly what to show there
// (one employee, one application, one vacancy, one staff line) and the screen it opens takes it once.
export type FocusTarget =
  | { kind: "employee"; id: string; name: string }
  | { kind: "application"; id: string; jobId: string; name: string }
  | { kind: "job"; id: string }
  | { kind: "staff"; department: string; position?: string };

let pending: FocusTarget | null = null;
export const setFocus = (target: FocusTarget | null) => {
  pending = target;
};
// Takes the target if it is of one of the kinds; a target of another kind stays for its own screen.
export function takeFocus<K extends FocusTarget["kind"]>(...kinds: K[]): Extract<FocusTarget, { kind: K }> | null {
  if (pending && (kinds as string[]).includes(pending.kind)) {
    const t = pending as Extract<FocusTarget, { kind: K }>;
    pending = null;
    return t;
  }
  return null;
}
