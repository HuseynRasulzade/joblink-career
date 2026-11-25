import type { Operator } from "./legal-text.ts";
import { CONTACT } from "./contact.ts";

// The company that runs JobMatch, as written in its state registration extract (Hüquqi şəxslərin dövlət qeydiyyatı idarəsi, 21.04.2025).
// The PLATFORM_* settings override these values when they are filled in.
export const COMPANY = {
  name: "“DİGİLABS” Məhdud Məsuliyyətli Cəmiyyəti",
  brand: "Digilabs",
  voen: "1906358781",
  address: "AZ1133, Bakı şəhəri, Suraxanı rayonu, AB Yaşayış sahəsi (Yeni Günəşli qəs.), ev 123, mənzil 64",
  registeredAt: "21.04.2025",
  registry: "Hüquqi şəxslərin dövlət qeydiyyatı idarəsi",
} as const;

type Settings = { PLATFORM_LEGAL_NAME?: string; PLATFORM_VOEN?: string; PLATFORM_ADDRESS?: string; PLATFORM_EMAIL?: string };

// Operator details for the legal pages and contracts: a filled-in setting wins, otherwise the registered company.
export function operatorOf(settings: Settings): Operator {
  return {
    name: settings.PLATFORM_LEGAL_NAME || COMPANY.name,
    voen: settings.PLATFORM_VOEN || COMPANY.voen,
    address: settings.PLATFORM_ADDRESS || COMPANY.address,
    email: settings.PLATFORM_EMAIL || CONTACT.email,
  };
}
