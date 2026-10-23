// "Similar vacancies": same field, shared title words and skills, same city; best matches first.
type Comparable = { id: string; title: string; category: string; city: string; skills: string[]; status?: string; deadline?: string };

const words = (title: string) => new Set(title.toLocaleLowerCase("az").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));

export function similarJobs<T extends Comparable>(current: T, all: T[], limit = 4, today = new Date().toISOString().slice(0, 10)): T[] {
  const titleWords = words(current.title);
  const skills = new Set(current.skills.map((s) => s.toLocaleLowerCase("az")));
  return all
    .filter((job) => job.id !== current.id && (job.status ?? "published") === "published" && !(job.deadline && job.deadline < today))
    .map((job) => {
      const other = words(job.title);
      const shared = [...titleWords].filter((w) => other.has(w)).length;
      const union = new Set([...titleWords, ...other]).size || 1;
      const sharedSkills = job.skills.filter((s) => skills.has(s.toLocaleLowerCase("az"))).length;
      const score = (job.category && job.category === current.category ? 3 : 0) + (shared / union) * 5 + Math.min(sharedSkills, 4) + (job.city === current.city ? 1 : 0);
      return { job, score, anchored: shared > 0 || sharedSkills > 0 || (!!job.category && job.category === current.category) };
    })
    .filter((x) => x.anchored && x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.job);
}
