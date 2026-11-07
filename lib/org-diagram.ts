// The layout of the organisation diagram: company → departments → sections → people, drawn top-down as cards joined by
// arrows. The people of a section stand in a column under it. Pure numbers, so the picture can be checked without a browser.
export type OrgPerson = { id: string; name: string; position: string; department: string; section: string; status: string };
export type OrgNode = { id: string; kind: "root" | "dept" | "section" | "person"; title: string; sub: string; x: number; y: number; w: number; h: number; childCount: number };
export type OrgEdge = { from: string; to: string; arrow: boolean };
export type OrgLayout = { nodes: OrgNode[]; edges: OrgEdge[]; width: number; height: number };

export const ORG: { w: number; rootH: number; deptH: number; sectionH: number; personH: number; gapX: number; gapY: number; personGap: number; pad: number } = { w: 208, rootH: 70, deptH: 74, sectionH: 74, personH: 62, gapX: 28, gapY: 64, personGap: 16, pad: 32 };
const NO_DEPT = "Departamentsiz";
const NO_SECTION = "Şöbəsiz";

export function layoutOrg(everyone: OrgPerson[], company: string, collapsed: ReadonlySet<string> = new Set()): OrgLayout {
  const people = everyone.filter((p) => p.status !== "left");
  const byDept = new Map<string, Map<string, OrgPerson[]>>();
  for (const p of [...people].sort((a, b) => a.name.localeCompare(b.name, "az"))) {
    const d = p.department || NO_DEPT;
    const s = p.section || "";
    const sections = byDept.get(d) || new Map<string, OrgPerson[]>();
    sections.set(s, [...(sections.get(s) || []), p]);
    byDept.set(d, sections);
  }
  const depts = [...byDept.keys()].sort((a, b) => a.localeCompare(b, "az"));
  const nodes: OrgNode[] = [];
  const edges: OrgEdge[] = [];
  const { w, gapX, gapY, personGap } = ORG;

  // A department with no named section puts its people straight under it.
  type Plan = { dept: string; groups: { key: string; name: string; people: OrgPerson[] }[]; direct: boolean; width: number };
  const plans: Plan[] = depts.map((dept) => {
    const sections = byDept.get(dept) as Map<string, OrgPerson[]>;
    const named = [...sections.keys()].filter((k) => k !== "").sort((a, b) => a.localeCompare(b, "az"));
    const direct = named.length === 0;
    const groups = direct ? [{ key: "", name: "", people: sections.get("") || [] }] : [...named, ...(sections.has("") ? [""] : [])].map((k) => ({ key: k, name: k || NO_SECTION, people: sections.get(k) || [] }));
    const open = !collapsed.has(`dept:${dept}`);
    const width = direct || !open ? w : Math.max(w, groups.length * w + (groups.length - 1) * gapX);
    return { dept, groups, direct, width };
  });
  const totalWidth = Math.max(w, plans.reduce((t, p) => t + p.width, 0) + Math.max(0, plans.length - 1) * gapX);
  // The company stands over the middle of its first and last department.
  const centres: number[] = [];
  let at = 0;
  for (const plan of plans) {
    centres.push(at + plan.width / 2);
    at += plan.width + gapX;
  }
  const rootX = centres.length ? (centres[0] + centres[centres.length - 1]) / 2 - w / 2 : (totalWidth - w) / 2;
  const rootId = "root";
  nodes.push({ id: rootId, kind: "root", title: company || "Şirkət", sub: `${people.length} işçi`, x: rootX, y: 0, w, h: ORG.rootH, childCount: plans.length });
  const deptY = ORG.rootH + gapY;

  let cursor = 0;
  let bottom = ORG.rootH;
  for (const plan of plans) {
    const cx = cursor + plan.width / 2;
    const deptId = `dept:${plan.dept}`;
    const count = plan.groups.reduce((t, g) => t + g.people.length, 0);
    nodes.push({ id: deptId, kind: "dept", title: plan.dept, sub: `${count} nəfər`, x: cx - w / 2, y: deptY, w, h: ORG.deptH, childCount: plan.direct ? count : plan.groups.length });
    edges.push({ from: rootId, to: deptId, arrow: true });
    bottom = Math.max(bottom, deptY + ORG.deptH);
    if (!collapsed.has(deptId)) {
      const stack = (parentId: string, parentBottom: number, list: OrgPerson[], x: number) => {
        let y = parentBottom + 44;
        let previous = parentId;
        for (const person of list) {
          const id = `person:${person.id}`;
          nodes.push({ id, kind: "person", title: person.name, sub: person.position || "Vəzifə yazılmayıb", x, y, w, h: ORG.personH, childCount: 0 });
          edges.push({ from: previous, to: id, arrow: previous === parentId });
          previous = id;
          y += ORG.personH + personGap;
        }
        bottom = Math.max(bottom, y - personGap);
      };
      if (plan.direct) stack(deptId, deptY + ORG.deptH, plan.groups[0].people, cx - w / 2);
      else {
        const span = plan.groups.length * w + (plan.groups.length - 1) * gapX;
        const sectionY = deptY + ORG.deptH + gapY;
        plan.groups.forEach((g, i) => {
          const x = cx - span / 2 + i * (w + gapX);
          const id = `section:${plan.dept}:${g.key}`;
          nodes.push({ id, kind: "section", title: g.name, sub: `${g.people.length} nəfər`, x, y: sectionY, w, h: ORG.sectionH, childCount: g.people.length });
          edges.push({ from: deptId, to: id, arrow: true });
          bottom = Math.max(bottom, sectionY + ORG.sectionH);
          stack(id, sectionY + ORG.sectionH, g.people, x);
        });
      }
    }
    cursor += plan.width + gapX;
  }
  return { nodes, edges, width: totalWidth + ORG.pad * 2, height: bottom + ORG.pad * 2 };
}
