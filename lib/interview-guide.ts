// The questions for an interview of a vacancy: the list written for that vacancy, else a list whose name carries the title of the
// vacancy, else questions made from the vacancy's own required skills so that an interviewer is never left with a blank page.
export type GuideTemplate = { id: string; name: string; jobId: string; questions: string[] };
export type Guide = { name: string; source: "linked" | "matched" | "generated"; questions: string[] };

const fold = (v: string) =>
  String(v ?? "").toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();

export function generatedQuestions(title: string, skills: string[]): string[] {
  const out = [`«${title}» vəzifəsi ilə niyə maraqlanırsınız və bu işdə özünüzü necə görürsünüz?`, "Son iş yerinizdə ən böyük nailiyyətiniz nə olub? Konkret nəticə ilə izah edin."];
  for (const skill of skills.filter(Boolean).slice(0, 6)) out.push(`«${skill}» üzrə təcrübənizi və bu bacarığı tətbiq etdiyiniz bir konkret nümunəni izah edin.`);
  out.push("Çətin bir vəziyyətlə (tələsik iş, mübahisə, səhv) necə rastlaşmısınız və nə etdiniz?", "Maaş gözləntiniz nədir və nə vaxt işə başlaya bilərsiniz?", "Bizə verəcəyiniz suallar var?");
  return out;
}

export function guideFor(job: { id: string; title: string; skills: string[] }, templates: GuideTemplate[]): Guide {
  const linked = templates.find((t) => t.jobId === job.id);
  if (linked) return { name: linked.name, source: "linked", questions: linked.questions };
  const title = fold(job.title);
  const matched = title.length >= 3 ? templates.find((t) => !t.jobId && fold(t.name).includes(title)) : undefined;
  if (matched) return { name: matched.name, source: "matched", questions: matched.questions };
  return { name: `${job.title}: avtomatik suallar`, source: "generated", questions: generatedQuestions(job.title, job.skills) };
}
