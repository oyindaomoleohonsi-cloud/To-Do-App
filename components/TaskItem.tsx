"use client";

import { useState } from "react";
import type { TaskWithOverdue } from "@/lib/tasks";

type TaskItemProps = {
  task: TaskWithOverdue;
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
};

function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const buttonClass =
  "min-h-11 min-w-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onRename,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsSaving(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTitle() {
    const nextTitle = draftTitle.trim();
    if (nextTitle.length === 0) {
      setError("Title is required");
      return;
    }

    await run(async () => {
      await onRename(task.id, nextTitle);
      setIsEditing(false);
    });
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        task.isOverdue ? "border-red-300 bg-red-50" : "border-slate-200"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          disabled={isSaving}
          onChange={(event) =>
            run(() => onToggleComplete(task.id, event.target.checked))
          }
          aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          className="mt-0.5 h-5 w-5 shrink-0 accent-slate-900"
        />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={draftTitle}
              maxLength={200}
              autoFocus
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveTitle();
                if (event.key === "Escape") {
                  setDraftTitle(task.title);
                  setIsEditing(false);
                }
              }}
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
              aria-label="Task title"
            />
          ) : (
            <p
              className={`break-words text-base ${
                task.completed ? "text-slate-400 line-through" : "text-slate-800"
              }`}
            >
              {task.title}
            </p>
          )}

          {task.dueDate && (
            <p
              className={`mt-1 text-sm ${
                task.isOverdue ? "font-medium text-red-600" : "text-slate-500"
              }`}
            >
              Due {formatDueDate(task.dueDate)}
              {task.isOverdue && " — overdue"}
            </p>
          )}

          {error && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={saveTitle}
              disabled={isSaving}
              className={`${buttonClass} border-slate-900 bg-slate-900 text-white`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftTitle(task.title);
                setIsEditing(false);
              }}
              disabled={isSaving}
              className={buttonClass}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftTitle(task.title);
              setIsEditing(true);
            }}
            disabled={isSaving}
            className={buttonClass}
          >
            Edit
          </button>
        )}

        <button
          type="button"
          onClick={() => run(() => onDelete(task.id))}
          disabled={isSaving}
          className={`${buttonClass} border-red-300 text-red-600 hover:bg-red-50`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
