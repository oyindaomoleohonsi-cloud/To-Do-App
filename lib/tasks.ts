/**
 * Task types, date helpers and the single source of truth for the overdue rule.
 * Both the API and the UI import from here so the rule is never re-implemented.
 */

export type Task = {
  id: string;
  title: string;
  description: string | null;
  /** Due date as a plain `YYYY-MM-DD` string, or null when the task has none. */
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A task plus the derived `isOverdue` flag sent to the client. */
export type TaskWithOverdue = Task & { isOverdue: boolean };

/** Fields a client may send when creating a task. */
export type CreateTaskInput = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
};

/** Fields a client may send when editing a task. Every field is optional. */
export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  completed?: boolean;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a real `YYYY-MM-DD` calendar date (rejects 2026-02-30). */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Today's local date as `YYYY-MM-DD`.
 *
 * Built from local date parts on purpose: `toISOString()` converts to UTC, which
 * can shift the day and make a task due today look overdue in some timezones.
 */
export function toTodayString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * The overdue rule.
 *
 * A task is overdue only when it is not completed, has a due date, and that due
 * date is strictly before today. Due today is NOT overdue, and a completed task
 * is never overdue.
 */
export function isOverdue(
  task: Pick<Task, "dueDate" | "completed">,
  today: string = toTodayString(),
): boolean {
  if (task.completed) return false;
  if (!task.dueDate) return false;

  // `YYYY-MM-DD` strings sort correctly with a plain string comparison.
  return task.dueDate < today;
}

/** Adds the derived `isOverdue` flag that the API sends to the client. */
export function toTaskWithOverdue(
  task: Task,
  today: string = toTodayString(),
): TaskWithOverdue {
  return { ...task, isOverdue: isOverdue(task, today) };
}
