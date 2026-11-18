// Builds app/ember.css: the dark "ember" look of the public page (warm black, glass cards, orange accent) for every screen of the app.
// It reads the light stylesheets, maps every colour to the ember palette by its role (surface, text, line, shadow) and writes the result as
// overrides under html[data-theme="dark"]. Run: node scripts/gen-ember-theme.mjs   (the output file is committed).
import fs from "node:fs";
import postcss from "postcss";
import valueParser from "postcss-value-parser";

const SOURCES = ["app/joblink.css", "app/features.css", "app/polish.css", "app/landing.css"];
const OUT = "app/ember.css";
const PREFIX = 'html[data-theme="dark"]';
// The public page already has its own dark look; these selectors are left alone.
const SKIP_SELECTOR = /^(\.landing|\.gate-|\.auth-gate|\.pj\b|\.pj-|\.pc\b|\.pc-|\.job-tile|\.plan-badge)/;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function hslOf({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
const hsla = (h, s, l, a = 1) => `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${+a.toFixed(2)})`;
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${+clamp(a, 0, 1).toFixed(2)})`;

function parseColorWord(word) {
  const v = word.toLowerCase();
  if (v === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (v === "black") return { r: 0, g: 0, b: 0, a: 1 };
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (!m) return null;
  let hex = m[1];
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
  const n = (i) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
}
function parseColorFunction(node) {
  const name = node.value.toLowerCase();
  if (!["rgb", "rgba", "hsl", "hsla"].includes(name)) return null;
  const nums = node.nodes.filter((n) => n.type === "word").map((n) => n.value);
  if (nums.some((x) => x.startsWith("var") || Number.isNaN(parseFloat(x)))) return null;
  const val = (x, scale) => (x.endsWith("%") ? (parseFloat(x) / 100) * scale : parseFloat(x));
  if (name.startsWith("rgb")) {
    return { r: clamp(val(nums[0], 255), 0, 255), g: clamp(val(nums[1], 255), 0, 255), b: clamp(val(nums[2], 255), 0, 255), a: nums[3] !== undefined ? val(nums[3], 1) : 1 };
  }
  const h = parseFloat(nums[0]);
  const s = val(nums[1], 1);
  const l = val(nums[2], 1);
  const a = nums[3] !== undefined ? val(nums[3], 1) : 1;
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
}

const isTealHue = (h, s) => s >= 0.18 && h >= 158 && h <= 205;

// Surfaces: light panels become glass, tinted chips become translucent accent chips, teal solids become orange solids.
function mapSurface(c, state) {
  if (c.a < 0.05) return null;
  const { h, s, l } = hslOf(c);
  const neutral = s < 0.18;
  const teal = isTealHue(h, s);
  const k = c.a;
  if (l >= 0.88) {
    if (neutral || (h >= 120 && h < 158 && s < 0.45)) return rgba(255, 255, 255, (state ? 0.12 : l >= 0.97 ? 0.06 : 0.045) * k);
    if (teal || (h >= 55 && h < 120)) return rgba(255, 138, 76, (state ? 0.22 : 0.15) * k);
    return hsla(h, 0.8, 0.6, (state ? 0.24 : 0.16) * k);
  }
  if (l >= 0.68) {
    if (neutral) return rgba(255, 255, 255, (state ? 0.16 : 0.1) * k);
    if (teal) return rgba(255, 138, 76, 0.24 * k);
    if (h >= 55 && h < 120) return rgba(255, 150, 60, 0.22 * k);
    return hsla(h, 0.75, 0.58, 0.26 * k);
  }
  if (teal && l >= 0.15) return hsla(16, 0.76, clamp(l * 1.5, 0.24, 0.52), c.a);
  if (l < 0.32 && s > 0.1 && (teal || h >= 150)) return hsla(8, 0.45, l * 0.95, c.a);
  return null;
}
function mapText(c) {
  const { h, s, l } = hslOf(c);
  if (l >= 0.85) return null;
  const neutral = s < 0.18;
  if (isTealHue(h, s) || (h >= 130 && h < 158 && s < 0.5)) return hsla(22, 1, l < 0.62 ? 0.77 : 0.82, c.a);
  if (neutral) return l < 0.62 ? hsla(24, 0.4, clamp(0.94 - l * 0.32, 0.7, 0.95), c.a) : null;
  return l < 0.7 ? hsla(h, Math.min(s, 0.9), 0.74, c.a) : null;
}
function mapLine(c) {
  if (c.a < 0.05) return null;
  const { h, s, l } = hslOf(c);
  if (l >= 0.72) return rgba(255, 255, 255, 0.14 * c.a);
  if (isTealHue(h, s) && l >= 0.2) return "#ff8a4c";
  if (l < 0.25) return rgba(255, 255, 255, 0.45 * c.a);
  return null;
}
function mapShadow(c) {
  if (c.r > 240 && c.g > 240 && c.b > 240) return null;
  return rgba(0, 0, 0, Math.min(0.6, c.a * 1.6 + 0.04));
}

const ROLE = (prop) => {
  if (prop.startsWith("--")) {
    if (/^--ov-\d$/.test(prop)) return "ramp";
    if (/ink|text|muted|foreground/.test(prop)) return "text";
    if (/grid|line|border/.test(prop)) return "line";
    if (/bg|empty|soft|surface|panel|background/.test(prop)) return "surface";
    return null;
  }
  if (/^(background|background-color|background-image)$/.test(prop)) return "surface";
  if (/^(color|fill|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)) return "text";
  if (prop === "stroke") return "stroke";
  if (/^(border|outline|column-rule)(-|$)|^scrollbar-color$/.test(prop)) return "line";
  if (/^(box-shadow|text-shadow)$/.test(prop)) return "shadow";
  return null;
};

function mapValue(value, role, state) {
  const parsed = valueParser(value);
  let changed = false;
  const mapColor = (c) => {
    if (role === "surface") return mapSurface(c, state);
    if (role === "text") return mapText(c);
    if (role === "line") return mapLine(c);
    if (role === "shadow") return mapShadow(c);
    if (role === "ramp") {
      const { h, s, l } = hslOf(c);
      return isTealHue(h, s) ? hsla(18, clamp(s, 0.55, 0.8), l) : null;
    }
    if (role === "stroke") {
      const { s, l } = hslOf(c);
      return s < 0.18 && l >= 0.72 ? mapLine(c) : mapText(c);
    }
    return null;
  };
  parsed.walk((node) => {
    if (node.type === "function") {
      const lower = node.value.toLowerCase();
      if (lower === "var" || lower === "url" || lower === "calc") return false;
      const color = parseColorFunction(node);
      if (color) {
        const out = mapColor(color);
        if (out) {
          node.type = "word";
          node.value = out;
          changed = true;
        }
        return false;
      }
      return undefined;
    }
    if (node.type === "word") {
      const color = parseColorWord(node.value);
      if (color) {
        const out = mapColor(color);
        if (out) {
          node.value = out;
          changed = true;
        }
      }
    }
    return undefined;
  });
  return changed ? parsed.toString() : null;
}

const STATE = /:hover|:focus|:active|\.on\b|\.active\b|\.selected\b|\.open\b|\[aria-(pressed|selected|current|expanded)/;

function prefixSelectors(rule) {
  const out = [];
  for (const sel of rule.selectors) {
    const s = sel.trim();
    if (!s || SKIP_SELECTOR.test(s) || s.includes("data-theme") || /^(html|:root)\b/.test(s) || s.startsWith("@")) continue;
    out.push(`${PREFIX} ${s}`);
  }
  return out;
}

function emit(nodes, chain, lines) {
  for (const node of nodes) {
    if (node.type === "rule") {
      if (node.parent && node.parent.type === "atrule" && /keyframes$/i.test(node.parent.name)) continue;
      const selectors = prefixSelectors(node);
      if (!selectors.length) continue;
      const state = node.selectors.some((s) => STATE.test(s));
      const decls = [];
      node.walkDecls((d) => {
        if (d.parent !== node) return;
        const role = ROLE(d.prop.toLowerCase());
        if (!role) return;
        const mapped = mapValue(d.value, role, state);
        if (mapped) decls.push(`${d.prop}: ${mapped}${d.important ? " !important" : ""}`);
      });
      if (!decls.length) continue;
      const body = `${selectors.join(",\n")} { ${decls.join("; ")}; }`;
      lines.push(chain.length ? `${chain.map((c) => `@${c} {`).join(" ")} ${body} ${"}".repeat(chain.length)}` : body);
    } else if (node.type === "atrule" && (node.name === "media" || node.name === "supports")) {
      emit(node.nodes || [], [...chain, `${node.name} ${node.params}`], lines);
    }
  }
}

const lines = [];
for (const file of SOURCES) emit(postcss.parse(fs.readFileSync(file, "utf8")).nodes, [], lines);
const header = "/* GENERATED by scripts/gen-ember-theme.mjs from the light stylesheets: do not edit by hand (hand-written parts are in ember-base.css). */\n";
fs.writeFileSync(OUT, `${header}@media screen {\n${lines.join("\n")}\n}\n`);
console.log(`${OUT}: ${lines.length} rules`);
