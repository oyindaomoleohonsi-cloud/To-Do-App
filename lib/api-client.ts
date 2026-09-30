import type { CreateTaskInput, TaskWithOverdue, UpdateTaskInput } from "./tasks";

/** An error carrying the message the API returned, so the UI can show it. */
export class ApiError extends Error {}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : "Something went wrong. Please try again.";

    throw new ApiError(message);
  }

  return data as T;
}

export async function listTasks(): Promise<TaskWithOverdue[]> {
  const data = await request<{ tasks: TaskWithOverdue[] }>("/api/tasks");
  return data.tasks;
}

export async function createTask(
  input: CreateTaskInput,
): Promise<TaskWithOverdue> {
  const data = await request<{ task: TaskWithOverdue }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return data.task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<TaskWithOverdue> {
  const data = await request<{ task: TaskWithOverdue }>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/api/tasks/${id}`, {
    method: "DELETE",
  });
}
