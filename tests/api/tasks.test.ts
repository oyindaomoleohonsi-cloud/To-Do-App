import { beforeEach, describe, expect, it } from "vitest";
import { clearAllTasks } from "@/lib/repository";
import { toTodayString } from "@/lib/tasks";
import { GET, POST } from "@/app/api/tasks/route";
import {
  DELETE,
  GET as GET_TASK,
  PATCH,
} from "@/app/api/tasks/[id]/route";

/** Builds a Request the way the routes receive one. */
function request(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Builds a context with a resolved id, matching Next's async `params`. */
function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createTask(title = "Buy milk", extra: object = {}) {
  const response = await POST(request({ title, ...extra }));
  const data = await response.json();

  return { response, task: data.task as { id: string } };
}

beforeEach(() => {
  clearAllTasks();
});

describe("POST /api/tasks", () => {
  it("creates a task and returns 201", async () => {
    const response = await POST(request({ title: "Buy milk" }));
    const { task } = await response.json();

    expect(response.status).toBe(201);
    expect(task).toMatchObject({
      title: "Buy milk",
      description: null,
      dueDate: null,
      completed: false,
      isOverdue: false,
    });
    expect(task.id).toEqual(expect.any(String));
  });

  it("accepts an optional description and due date", async () => {
    const response = await POST(
      request({ title: "Report", description: "Quarterly", dueDate: "2030-01-15" }),
    );
    const { task } = await response.json();

    expect(response.status).toBe(201);
    expect(task).toMatchObject({
      title: "Report",
      description: "Quarterly",
      dueDate: "2030-01-15",
    });
  });

  it("trims whitespace from the title", async () => {
    const response = await POST(request({ title: "   Buy milk   " }));
    const { task } = await response.json();

    expect(task.title).toBe("Buy milk");
  });

  it("treats an empty due date as no due date", async () => {
    const response = await POST(request({ title: "Task", dueDate: "" }));
    const { task } = await response.json();

    expect(response.status).toBe(201);
    expect(task.dueDate).toBeNull();
  });

  it("returns 400 when the title is missing", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title is required" });
  });

  it("returns 400 when the title is only whitespace", async () => {
    const response = await POST(request({ title: "   " }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title is required" });
  });

  it("returns 400 when the title is not a string", async () => {
    const response = await POST(request({ title: 42 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title must be a string" });
  });

  it("returns 400 for a title that is too long", async () => {
    const response = await POST(request({ title: "a".repeat(201) }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Title must be 200 characters or fewer",
    });
  });

  it("returns 400 for a malformed due date", async () => {
    const response = await POST(request({ title: "Task", dueDate: "15-01-2030" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Due date must be a valid date in YYYY-MM-DD format",
    });
  });

  it("returns 400 for a due date that does not exist", async () => {
    const response = await POST(request({ title: "Task", dueDate: "2030-02-30" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Due date must be a valid date in YYYY-MM-DD format",
    });
  });

  it("returns 400 for an unknown field", async () => {
    const response = await POST(request({ title: "Task", colour: "red" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown field: colour" });
  });

  it("returns 400 for a body that is not a JSON object", async () => {
    const response = await POST(request(["not", "an", "object"]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Request body must be a JSON object",
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Request body must be valid JSON",
    });
  });
});

describe("GET /api/tasks", () => {
  it("returns an empty list when there are no tasks", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: [] });
  });

  it("returns the created tasks, newest first", async () => {
    await createTask("First");
    await createTask("Second");

    const response = await GET();
    const { tasks } = await response.json();

    expect(response.status).toBe(200);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Second");
    expect(tasks[1].title).toBe("First");
  });

  it("keeps the newest first even when timestamps collide", async () => {
    // `createdAt` has millisecond resolution, so tasks added in quick succession
    // can share a timestamp. The newest must still come first.
    const titles = ["A", "B", "C", "D", "E"];

    for (const title of titles) {
      await createTask(title);
    }

    const { tasks } = await (await GET()).json();

    expect(tasks.map((task: { title: string }) => task.title)).toEqual(
      [...titles].reverse(),
    );
  });

  it("includes the isOverdue flag on each task", async () => {
    await createTask("Overdue", { dueDate: "2000-01-01" });

    const response = await GET();
    const { tasks } = await response.json();

    expect(tasks[0].isOverdue).toBe(true);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns the task", async () => {
    const { task: created } = await createTask("Buy milk");

    const response = await GET_TASK(
      new Request(`http://localhost/api/tasks/${created.id}`),
      context(created.id),
    );
    const { task } = await response.json();

    expect(response.status).toBe(200);
    expect(task).toMatchObject({ id: created.id, title: "Buy milk" });
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET_TASK(
      new Request("http://localhost/api/tasks/missing"),
      context("missing"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Task not found" });
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("edits the title", async () => {
    const { task: created } = await createTask("Old title");

    const response = await PATCH(
      request({ title: "New title" }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(response.status).toBe(200);
    expect(task).toMatchObject({ id: created.id, title: "New title" });
  });

  it("changes the due date", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(
      request({ dueDate: "2030-06-01" }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(task.dueDate).toBe("2030-06-01");
  });

  it("clears the due date when an empty string is sent", async () => {
    const { task: created } = await createTask("Task", { dueDate: "2030-06-01" });

    const response = await PATCH(
      request({ dueDate: "" }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(task.dueDate).toBeNull();
  });

  it("marks a task complete", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(
      request({ completed: true }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(response.status).toBe(200);
    expect(task.completed).toBe(true);
  });

  it("marks a completed task incomplete again", async () => {
    const { task: created } = await createTask("Task");
    await PATCH(request({ completed: true }, "PATCH"), context(created.id));

    const response = await PATCH(
      request({ completed: false }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(task.completed).toBe(false);
  });

  it("leaves untouched fields alone", async () => {
    const { task: created } = await createTask("Task", { dueDate: "2030-06-01" });

    const response = await PATCH(
      request({ completed: true }, "PATCH"),
      context(created.id),
    );
    const { task } = await response.json();

    expect(task).toMatchObject({ title: "Task", dueDate: "2030-06-01" });
  });

  it("returns 404 for an unknown id", async () => {
    const response = await PATCH(
      request({ completed: true }, "PATCH"),
      context("missing"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Task not found" });
  });

  it("returns 400 for a blank title", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(
      request({ title: "  " }, "PATCH"),
      context(created.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title is required" });
  });

  it("returns 400 for a non-boolean completed value", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(
      request({ completed: "yes" }, "PATCH"),
      context(created.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Completed must be a boolean" });
  });

  it("returns 400 for an empty body", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(request({}, "PATCH"), context(created.id));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "At least one field must be provided",
    });
  });

  it("returns 400 for an unknown field", async () => {
    const { task: created } = await createTask("Task");

    const response = await PATCH(
      request({ done: true }, "PATCH"),
      context(created.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown field: done" });
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes the task", async () => {
    const { task: created } = await createTask("Task");

    const response = await DELETE(
      new Request(`http://localhost/api/tasks/${created.id}`, { method: "DELETE" }),
      context(created.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, id: created.id });
  });

  it("removes the task from the list", async () => {
    const { task: created } = await createTask("Task");
    await DELETE(
      new Request(`http://localhost/api/tasks/${created.id}`, { method: "DELETE" }),
      context(created.id),
    );

    const { tasks } = await (await GET()).json();
    expect(tasks).toHaveLength(0);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/tasks/missing", { method: "DELETE" }),
      context("missing"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Task not found" });
  });

  it("returns 404 when deleting the same task twice", async () => {
    const { task: created } = await createTask("Task");
    const url = new Request(`http://localhost/api/tasks/${created.id}`, {
      method: "DELETE",
    });

    await DELETE(url, context(created.id));
    const second = await DELETE(url, context(created.id));

    expect(second.status).toBe(404);
  });
});

describe("isOverdue flag returned by the API", () => {
  it("is true for an unfinished task due in the past", async () => {
    await createTask("Late", { dueDate: "2000-01-01" });

    const { tasks } = await (await GET()).json();
    expect(tasks[0].isOverdue).toBe(true);
  });

  it("is false for an unfinished task due today", async () => {
    const { task: created } = await createTask("Today", {
      dueDate: toTodayString(),
    });

    const { tasks } = await (await GET()).json();
    expect(tasks.find((t: { id: string }) => t.id === created.id).isOverdue).toBe(
      false,
    );
  });
});
