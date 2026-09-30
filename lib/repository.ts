import { getDatabase, type TaskRow } from "./db";
import type { CreateTaskInput, Task, UpdateTaskInput } from "./tasks";

/**
 * Everything the API needs from storage. Swapping SQLite for another database
 * later means writing another class with this shape and changing the
 * `taskRepository` export at the bottom of this file — the routes do not change.
 */
export interface TaskRepository {
  list(): Task[];
  findById(id: string): Task | undefined;
  create(input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | undefined;
  remove(id: string): boolean;
  clear(): void;
}

/** Converts a database row into the `Task` shape the app uses. */
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SqliteTaskRepository implements TaskRepository {
  list(): Task[] {
    // `created_at` has millisecond resolution, so two tasks added in the same
    // millisecond tie. `rowid` rises with insertion order, which keeps the
    // newest first deterministic.
    const rows = getDatabase()
      .prepare("SELECT * FROM tasks ORDER BY created_at DESC, rowid DESC")
      .all() as TaskRow[];

    return rows.map(toTask);
  }

  findById(id: string): Task | undefined {
    const row = getDatabase()
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id) as TaskRow | undefined;

    return row ? toTask(row) : undefined;
  }

  create(input: CreateTaskInput): Task {
    const database = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    database
      .prepare(
        `INSERT INTO tasks (id, title, description, due_date, completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description ?? null,
        input.dueDate ?? null,
        now,
        now,
      );

    const created = this.findById(id);
    if (!created) throw new Error("Task was not saved");

    return created;
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const database = getDatabase();

    // Column names are fixed literals below, so nothing user-supplied reaches
    // the SQL text. Values are always passed as parameters.
    const values: Array<string | number | null> = [];
    const assignments: string[] = [];

    if (input.title !== undefined) {
      assignments.push("title = ?");
      values.push(input.title);
    }
    if (input.description !== undefined) {
      assignments.push("description = ?");
      values.push(input.description);
    }
    if (input.dueDate !== undefined) {
      assignments.push("due_date = ?");
      values.push(input.dueDate);
    }
    if (input.completed !== undefined) {
      assignments.push("completed = ?");
      values.push(input.completed ? 1 : 0);
    }

    assignments.push("updated_at = ?");
    values.push(new Date().toISOString(), id);

    const result = database
      .prepare(`UPDATE tasks SET ${assignments.join(", ")} WHERE id = ?`)
      .run(...values);

    if (result.changes === 0) return undefined;

    return this.findById(id);
  }

  remove(id: string): boolean {
    return getDatabase().prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
  }

  clear(): void {
    getDatabase().prepare("DELETE FROM tasks").run();
  }
}

export const taskRepository: TaskRepository = new SqliteTaskRepository();

/** Removes every task. Used by tests to start from a clean slate. */
export function clearAllTasks(): void {
  taskRepository.clear();
}
