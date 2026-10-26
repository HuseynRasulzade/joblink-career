// Checklist for a new employee: first day, documents, equipment, introductions.
export type OnboardingTask = { title: string; offsetDays: number };

export const DEFAULT_ONBOARDING: OnboardingTask[] = [
  { title: "Əmək müqaviləsini imzalayın", offsetDays: 0 },
  { title: "Şəxsiyyət vəsiqəsi və sənəd surətlərini toplayın", offsetDays: 0 },
  { title: "Bank hesabı və ödəniş məlumatlarını alın", offsetDays: 0 },
  {
    title: "İş yeri və avadanlığı (kompüter, telefon) hazırlayın",
    offsetDays: 0,
  },
  { title: "E-poçt və sistemlərə girişi açın", offsetDays: 1 },
  { title: "Komanda ilə tanışlıq", offsetDays: 1 },
  { title: "Təhlükəsizlik və daxili qaydalarla tanışlıq", offsetDays: 3 },
  { title: "İlk həftə planı və hədəflərin razılaşdırılması", offsetDays: 5 },
  { title: "Sınaq müddəti hədəflərinin yazılması", offsetDays: 14 },
];

const isoDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
export function addDaysIso(date: string, days: number) {
  const base = new Date(
    `${isoDay(date) || new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

// Default tasks with due dates counted from the start of work.
export const defaultTasks = (startDate: string) =>
  DEFAULT_ONBOARDING.map((task) => ({
    title: task.title,
    due: addDaysIso(startDate, task.offsetDays),
  }));

export type TaskState = { done: number; due: string };
export function taskSummary(tasks: TaskState[], today: string) {
  const done = tasks.filter((task) => task.done).length;
  const overdue = tasks.filter(
    (task) => !task.done && task.due && task.due < today,
  ).length;
  return { total: tasks.length, done, overdue };
}

// Adds the default list once; an employee who already has tasks keeps them.
export async function seedOnboardingTasks(
  db: D1Database,
  companyId: string,
  employeeId: string,
  startDate: string,
) {
  const existing = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM employee_tasks WHERE company_id=? AND employee_id=?",
    )
    .bind(companyId, employeeId)
    .first<{ n: number }>()
    .catch(() => null);
  if (!existing || Number(existing.n) > 0) return 0;
  const now = new Date().toISOString();
  const tasks = defaultTasks(startDate);
  for (const [index, task] of tasks.entries())
    await db
      .prepare(
        "INSERT INTO employee_tasks(id,company_id,employee_id,title,due,position,created) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        companyId,
        employeeId,
        task.title,
        task.due,
        index,
        now,
      )
      .run();
  return tasks.length;
}
