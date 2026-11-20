"use client";
import { createContext, useContext, type ReactNode } from "react";

// The public page is light: it does not carry the translation tables (about 1 MB) unless the visitor picks English or Russian.
// The page that owns the language provides the translating function; without a provider the text stays as written (Azerbaijani).
export type Localize = (node: ReactNode) => ReactNode;
const keep: Localize = (node) => node;
export const LocalizeContext = createContext<Localize>(keep);
export const useLocalize = () => useContext(LocalizeContext);
