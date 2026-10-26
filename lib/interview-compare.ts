// Interview feedback of several candidates for one vacancy, side by side.
export type FeedbackRow = {
  application_id: string;
  job_id: string;
  job_title: string;
  candidate: string;
  application_status: string;
  scheduled_at: string;
  status: string;
  rating: number;
  feedback: string;
  decision: string;
};

export type CandidateComparison = {
  applicationId: string;
  candidate: string;
  applicationStatus: string;
  interviews: number;
  rated: number;
  average: number;
  ratings: number[];
  advance: number;
  hold: number;
  reject: number;
  lastDecision: string;
  lastFeedback: string;
  lastAt: string;
};
export type JobComparison = {
  jobId: string;
  jobTitle: string;
  candidates: CandidateComparison[];
};

const round1 = (value: number) => Math.round(value * 10) / 10;

// A candidate with higher average rating comes first; more "advance" votes and
// more rated interviews break ties. Candidates without a rating go last.
export function compareInterviews(rows: FeedbackRow[]): JobComparison[] {
  const jobs = new Map<string, JobComparison>();
  const byApplication = new Map<string, FeedbackRow[]>();
  for (const row of rows) {
    if (row.status === "cancelled" || row.status === "declined") continue;
    byApplication.set(row.application_id, [
      ...(byApplication.get(row.application_id) || []),
      row,
    ]);
  }
  for (const list of byApplication.values()) {
    const sorted = [...list].sort((a, b) =>
      a.scheduled_at.localeCompare(b.scheduled_at),
    );
    const rated = sorted.filter((row) => row.rating > 0);
    const last = [...rated].pop() || sorted[sorted.length - 1];
    const head = sorted[0];
    const entry: CandidateComparison = {
      applicationId: head.application_id,
      candidate: head.candidate,
      applicationStatus: head.application_status,
      interviews: sorted.length,
      rated: rated.length,
      average: rated.length
        ? round1(rated.reduce((sum, row) => sum + row.rating, 0) / rated.length)
        : 0,
      ratings: rated.map((row) => row.rating),
      advance: rated.filter((row) => row.decision === "advance").length,
      hold: rated.filter((row) => row.decision === "hold").length,
      reject: rated.filter((row) => row.decision === "reject").length,
      lastDecision: rated.length ? last.decision : "",
      lastFeedback: rated.length ? last.feedback : "",
      lastAt: last.scheduled_at,
    };
    const job = jobs.get(head.job_id) || {
      jobId: head.job_id,
      jobTitle: head.job_title,
      candidates: [],
    };
    job.candidates.push(entry);
    jobs.set(head.job_id, job);
  }
  for (const job of jobs.values())
    job.candidates.sort(
      (a, b) =>
        (b.rated ? 1 : 0) - (a.rated ? 1 : 0) ||
        b.average - a.average ||
        b.advance - a.advance ||
        b.rated - a.rated ||
        a.candidate.localeCompare(b.candidate, "az"),
    );
  return [...jobs.values()].sort((a, b) =>
    a.jobTitle.localeCompare(b.jobTitle, "az"),
  );
}
