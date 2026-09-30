"use client";

import StateMessage from "./StateMessage";
import TaskItem from "./TaskItem";
import type { TaskWithOverdue } from "@/lib/tasks";

type TaskListProps = {
  tasks: TaskWithOverdue[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
};

export default function TaskList({
  tasks,
  isLoading,
  error,
  onRetry,
  onToggleComplete,
  onDelete,
  onRename,
}: TaskListProps) {
  if (isLoading) {
    return <StateMessage variant="loading" title="Loading your tasks…" />;
  }

  if (error) {
    return (
      <StateMessage
        variant="error"
        title="We could not load your tasks"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="No tasks yet"
        description="Add your first one using the form above."
      />
    );
  }

  const openCount = tasks.filter((task) => !task.completed).length;

  return (
    <section aria-label="Tasks">
      <p className="mb-2 text-sm text-slate-500">
        {openCount === 0
          ? `All ${tasks.length} tasks done. Nice work.`
          : `${openCount} of ${tasks.length} left to do.`}
      </p>

      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </ul>
    </section>
  );
}
