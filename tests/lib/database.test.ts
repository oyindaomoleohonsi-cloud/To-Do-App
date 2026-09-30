import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { DATABASE_PATH } from "@/lib/env";
import { clearAllTasks, taskRepository } from "@/lib/repository";
import type { CreateTaskInput } from "@/lib/tasks";

beforeAll(() => {
  // Start from an empty database. Rows are cleared rather than the file deleted
  // because other test files run in parallel with this one and hold the same
  // SQLite file open. The file itself is removed by tests/global-setup.ts.
  clearAllTasks();
});

describe("SQLite storage", () => {
  it("writes to a real file, not to memory", () => {
    taskRepository.create({ title: "Persisted task" });

    expect(fs.existsSync(DATABASE_PATH)).toBe(true);
  });

  it("can be read back by a separate connection to the same file", () => {
    // This is what a server restart looks like: a brand new connection reading
    // the database from disk with no in-process state in common.
    const independentConnection = new Database(DATABASE_PATH, { readonly: true });

    const rows = independentConnection
      .prepare("SELECT title FROM tasks")
      .all() as Array<{ title: string }>;

    independentConnection.close();

    expect(rows.map((row) => row.title)).toContain("Persisted task");
  });

  it("returns the same task through the repository after a clear and re-create", () => {
    clearAllTasks();
    expect(taskRepository.list()).toHaveLength(0);

    const created: CreateTaskInput = { title: "Second run", dueDate: "2030-01-01" };
    const task = taskRepository.create(created);

    expect(taskRepository.findById(task.id)).toMatchObject({
      id: task.id,
      title: "Second run",
      dueDate: "2030-01-01",
      completed: false,
    });
  });

  it("keeps new tasks first even when timestamps collide", () => {
    clearAllTasks();

    // Created in a tight loop, so several share the same millisecond.
    const titles = ["A", "B", "C", "D", "E"];
    for (const title of titles) {
      taskRepository.create({ title });
    }

    expect(taskRepository.list().map((task) => task.title)).toEqual(
      [...titles].reverse(),
    );
  });

  it("stores completed as a real boolean round trip", () => {
    clearAllTasks();
    const task = taskRepository.create({ title: "Toggle me" });

    taskRepository.update(task.id, { completed: true });
    expect(taskRepository.findById(task.id)?.completed).toBe(true);

    taskRepository.update(task.id, { completed: false });
    expect(taskRepository.findById(task.id)?.completed).toBe(false);
  });

  it("leaves omitted fields untouched on update", () => {
    clearAllTasks();
    const task = taskRepository.create({
      title: "Keep my date",
      description: "And my description",
      dueDate: "2030-06-01",
    });

    taskRepository.update(task.id, { completed: true });

    expect(taskRepository.findById(task.id)).toMatchObject({
      title: "Keep my date",
      description: "And my description",
      dueDate: "2030-06-01",
      completed: true,
    });
  });

  it("can clear a due date by sending null", () => {
    clearAllTasks();
    const task = taskRepository.create({ title: "Has a date", dueDate: "2030-06-01" });

    taskRepository.update(task.id, { dueDate: null });

    expect(taskRepository.findById(task.id)?.dueDate).toBeNull();
  });

  it("reports no change when updating a task that does not exist", () => {
    expect(taskRepository.update("does-not-exist", { completed: true })).toBeUndefined();
  });

  it("reports no change when deleting a task that does not exist", () => {
    expect(taskRepository.remove("does-not-exist")).toBe(false);
  });

  it("stores the database outside the repo when DATABASE_PATH is relative", () => {
    // Guards against the file being written somewhere unexpected.
    expect(path.isAbsolute(DATABASE_PATH)).toBe(true);
    expect(DATABASE_PATH).toContain(`${path.sep}.data${path.sep}`);
  });
});
