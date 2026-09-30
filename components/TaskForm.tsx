"use client";

import { useState, type FormEvent } from "react";

type TaskFormProps = {
  /** Called with the trimmed values. Rejects when the request failed. */
  onCreate: (input: { title: string; dueDate: string | null }) => Promise<void>;
};

export default function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await onCreate({
        title,
        dueDate: dueDate === "" ? null : dueDate,
      });

      setTitle("");
      setDueDate("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the task");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
    >
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="task-title" className="text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
        />
      </div>

      <div className="flex w-full flex-col gap-1 sm:w-44">
        <label htmlFor="task-due-date" className="text-sm font-medium text-slate-700">
          Due date <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="task-due-date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="min-h-11 w-full rounded-lg bg-slate-900 px-5 py-2 text-base font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSaving ? "Adding…" : "Add task"}
      </button>

      {error && (
        <p className="text-sm text-red-600 sm:basis-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
