"use client";

import { useEffect, useState } from "react";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import { createTask, deleteTask, listTasks, updateTask } from "@/lib/api-client";
import type { TaskWithOverdue } from "@/lib/tasks";

/** Turns any thrown value into a message we can show the user. */
function toMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Something went wrong";
}

/** Owns the task list state and talks to the API with `fetch`. */
export default function TaskApp() {
  const [tasks, setTasks] = useState<TaskWithOverdue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State is only set inside the fetch callbacks, never synchronously in the
  // effect body, so the initial load does not cause a cascading render.
  useEffect(() => {
    let isCurrent = true;

    listTasks().then(
      (loaded) => {
        if (!isCurrent) return;
        setTasks(loaded);
        setIsLoading(false);
      },
      (cause: unknown) => {
        if (!isCurrent) return;
        setError(toMessage(cause));
        setIsLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, []);

  /** Reloads the list, used by the "Try again" button. */
  async function refresh() {
    setIsLoading(true);
    setError(null);

    try {
      setTasks(await listTasks());
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }

  // Replaces one task in place so the list does not jump after an edit.
  function replaceTask(updated: TaskWithOverdue) {
    setTasks((current) =>
      current.map((task) => (task.id === updated.id ? updated : task)),
    );
  }

  function findTask(id: string): TaskWithOverdue | undefined {
    return tasks.find((task) => task.id === id);
  }

  async function handleCreate(input: {
    title: string;
    dueDate: string | null;
  }): Promise<void> {
    const task = await createTask(input);
    setTasks((current) => [task, ...current]);
  }

  async function handleToggleComplete(
    id: string,
    completed: boolean,
  ): Promise<void> {
    const previous = findTask(id);
    if (!previous) return;

    // Show the new state immediately, then roll back if the request fails.
    replaceTask({ ...previous, completed });

    try {
      replaceTask(await updateTask(id, { completed }));
    } catch (cause) {
      replaceTask(previous);
      throw cause; // TaskItem displays the message.
    }
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function handleRename(id: string, title: string): Promise<void> {
    replaceTask(await updateTask(id, { title }));
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskForm onCreate={handleCreate} />
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refresh()}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    </div>
  );
}
