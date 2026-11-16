// Data whose shape is not fixed: the answer of the AI, a parsed CV, the body the site's own API returns to the page.
// It is always checked field by field right where it is read; this one alias is the only place the rule against `any` is lifted.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;
