import { describe, expect, it } from "vitest";
import {
  isOverdue,
  isValidDateString,
  toTaskWithOverdue,
  toTodayString,
} from "@/lib/tasks";
import type { Task } from "@/lib/tasks";

const TODAY = "2026-09-30";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test task",
    description: null,
    dueDate: null,
    completed: false,
    createdAt: "2026-09-30T09:00:00.000Z",
    updatedAt: "2026-09-30T09:00:00.000Z",
    ...overrides,
  };
}

describe("isOverdue", () => {
  it("is true for an unfinished task due yesterday", () => {
    expect(isOverdue(makeTask({ dueDate: "2026-09-29" }), TODAY)).toBe(true);
  });

  it("is true for an unfinished task due long ago", () => {
    expect(isOverdue(makeTask({ dueDate: "2000-01-01" }), TODAY)).toBe(true);
  });

  it("is false for an unfinished task due today", () => {
    expect(isOverdue(makeTask({ dueDate: TODAY }), TODAY)).toBe(false);
  });

  it("is false for an unfinished task due tomorrow", () => {
    expect(isOverdue(makeTask({ dueDate: "2026-10-01" }), TODAY)).toBe(false);
  });

  it("is false for a completed task due yesterday", () => {
    expect(
      isOverdue(makeTask({ dueDate: "2026-09-29", completed: true }), TODAY),
    ).toBe(false);
  });

  it("is false for a completed task with no due date", () => {
    expect(isOverdue(makeTask({ completed: true }), TODAY)).toBe(false);
  });

  it("is false for an unfinished task with no due date", () => {
    expect(isOverdue(makeTask({ dueDate: null }), TODAY)).toBe(false);
  });

  it("treats a due date of yesterday as overdue across a month boundary", () => {
    expect(isOverdue(makeTask({ dueDate: "2026-08-31" }), "2026-09-01")).toBe(
      true,
    );
  });

  it("handles a leap day correctly", () => {
    expect(isOverdue(makeTask({ dueDate: "2028-02-28" }), "2028-02-29")).toBe(
      true,
    );
    expect(isOverdue(makeTask({ dueDate: "2028-02-29" }), "2028-02-29")).toBe(
      false,
    );
  });
});

describe("toTodayString", () => {
  it("formats today as YYYY-MM-DD", () => {
    expect(toTodayString(new Date(2026, 8, 30))).toBe("2026-09-30");
  });

  it("pads single-digit months and days", () => {
    expect(toTodayString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses the local date, not the UTC date, late at night", () => {
    // 23:30 on 30 Sep local. If this used toISOString() the result could be
    // 2026-10-01 in a timezone ahead of UTC, which would misclassify a task
    // due today as overdue.
    const lateEvening = new Date(2026, 8, 30, 23, 30);
    expect(toTodayString(lateEvening)).toBe("2026-09-30");
  });

  it("uses the local date, not the UTC date, just after midnight", () => {
    const justAfterMidnight = new Date(2026, 8, 30, 0, 30);
    expect(toTodayString(justAfterMidnight)).toBe("2026-09-30");
  });
});

describe("toTaskWithOverdue", () => {
  it("adds the isOverdue flag without dropping other fields", () => {
    const result = toTaskWithOverdue(makeTask({ dueDate: "2026-09-01" }), TODAY);

    expect(result.isOverdue).toBe(true);
    expect(result.id).toBe("task-1");
    expect(result.title).toBe("Test task");
  });
});

describe("isValidDateString", () => {
  it("accepts a real date", () => {
    expect(isValidDateString("2026-09-30")).toBe(true);
  });

  it("accepts a leap day in a leap year", () => {
    expect(isValidDateString("2028-02-29")).toBe(true);
  });

  it("rejects a non-leap-year February 29th", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
  });

  it("rejects a day that does not exist", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
  });

  it("rejects a month that does not exist", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
  });

  it("rejects the wrong format", () => {
    expect(isValidDateString("30-09-2026")).toBe(false);
    expect(isValidDateString("2026/09/30")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });
});
