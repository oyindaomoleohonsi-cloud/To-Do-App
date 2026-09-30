import type { CreateTaskInput, Task, UpdateTaskInput } from "./tasks";

/**
 * Everything the API needs from storage. Swapping the in-memory implementation
 * for a real database later means writing another class with this shape and
 * changing the `taskRepository` export at the bottom of this file — the routes
 * do not change.
 */
export interface TaskRepository {
  list(): Task[];
  findById(id: string): Task | undefined;
  create(input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | undefined;
  remove(id: string): boolean;
  clear(): void;
}

class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  list(): Task[] {
    // Two tasks created in the same millisecond share a `createdAt`, which makes
    // the date comparison a tie. Falling back to the insertion order keeps the
    // newest first deterministic instead of leaving it to the sort.
    return [...this.tasks.values()]
      .map((task, index) => ({ index, task }))
      .sort((a, b) => {
        const byDate = b.task.createdAt.localeCompare(a.task.createdAt);
        return byDate !== 0 ? byDate : b.index - a.index;
      })
      .map(({ task }) => task);
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated: Task = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.completed !== undefined && { completed: input.completed }),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.tasks.delete(id);
  }

  clear(): void {
    this.tasks.clear();
  }
}

// Kept on globalThis so data survives hot-reloads in `next dev` instead of
// silently resetting to an empty list every time a file is edited.
const globalScope = globalThis as typeof globalThis & {
  __inMemoryTaskRepository?: TaskRepository;
};

export const taskRepository: TaskRepository =
  globalScope.__inMemoryTaskRepository ?? new InMemoryTaskRepository();

globalScope.__inMemoryTaskRepository = taskRepository;

/** Removes every task. Used by tests to start from a clean slate. */
export function clearAllTasks(): void {
  taskRepository.clear();
}
