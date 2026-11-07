"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Layers, Maximize2, Minus, Plus, UserRound, Users } from "lucide-react";
import { layoutOrg, type OrgNode, type OrgPerson } from "@/lib/org-diagram";

const LABEL: Record<OrgNode["kind"], string> = { root: "Şirkət", dept: "Departament", section: "Şöbə", person: "İşçi" };
const ICON = { root: Building2, dept: Layers, section: Users, person: UserRound } as const;

// The organisation as a flow of cards joined by arrows: company, departments, sections, people. A department can be folded.
export default function OrgDiagram({ people, company }: { people: OrgPerson[]; company: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const frame = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutOrg(people, company, collapsed), [people, company, collapsed]);
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const fit = () => {
    const room = frame.current?.clientWidth || 0;
    if (room > 0) setZoom(Math.max(0.35, Math.min(1, Math.round((room / layout.width) * 100) / 100)));
  };
  // Wide pictures start fitted to the window.
  useEffect(() => {
    const room = frame.current?.clientWidth || 0;
    if (room > 0 && layout.width > room) setZoom(Math.max(0.35, Math.min(1, Math.round((room / layout.width) * 100) / 100)));
    // only on the first drawing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = (id: string) => setCollapsed((set) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const pad = 32;
  return (
    <div className="od">
      <div className="od-tools" role="group" aria-label="Sxemi böyüt və ya kiçilt">
        <button type="button" aria-label="Kiçilt" onClick={() => setZoom((z) => Math.max(0.35, Math.round((z - 0.1) * 100) / 100))}><Minus size={15} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Böyüt" onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}><Plus size={15} /></button>
        <button type="button" aria-label="Pəncərəyə sığdır" onClick={fit}><Maximize2 size={15} /></button>
      </div>
      <div className="od-frame" ref={frame}>
        <div className="od-canvas" style={{ width: layout.width * zoom, height: layout.height * zoom }}>
          <div className="od-scale" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
            <svg className="od-edges" width={layout.width} height={layout.height} aria-hidden="true">
              <defs>
                <marker id="od-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 z" fill="#5d6b6f" /></marker>
              </defs>
              {layout.edges.map((e) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) return null;
                const x1 = pad + a.x + a.w / 2;
                const y1 = pad + a.y + a.h;
                const x2 = pad + b.x + b.w / 2;
                const y2 = pad + b.y;
                const d = Math.max(18, (y2 - y1) / 2);
                return <path key={`${e.from}>${e.to}`} d={`M${x1} ${y1} C${x1} ${y1 + d} ${x2} ${y2 - d} ${x2} ${y2}`} fill="none" stroke="#5d6b6f" strokeWidth="2" strokeLinecap="round" markerEnd={e.arrow ? "url(#od-arrow)" : undefined} />;
              })}
            </svg>
            {layout.nodes.map((n) => {
              const Icon = ICON[n.kind];
              const foldable = n.kind === "dept" && n.childCount > 0;
              return (
                <div key={n.id} className={`od-node od-${n.kind}`} style={{ left: pad + n.x, top: pad + n.y, width: n.w, height: n.h }}>
                  <span className="od-pill"><Icon size={13} /> {n.kind === "person" ? n.sub : LABEL[n.kind]}</span>
                  <div className="od-body">
                    <b title={n.title}>{n.title}</b>
                    {n.kind !== "person" && <small>{n.sub}</small>}
                  </div>
                  {foldable && (
                    <button type="button" className="od-fold" aria-expanded={!collapsed.has(n.id)} aria-label={`${n.title}: ${collapsed.has(n.id) ? "aç" : "yığ"}`} onClick={() => toggle(n.id)}>
                      {collapsed.has(n.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
