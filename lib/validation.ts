import { isValidDateString } from "./tasks";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

const CREATE_FIELDS = ["title", "description", "dueDate"];
const UPDATE_FIELDS = ["title", "description", "dueDate", "completed"];

/**
 * Checks that the request body is a JSON object, and that it only contains
 * fields we understand. Unknown fields are an error rather than being dropped,
 * so a misspelled key never looks like a successful update.
 */
function validateShape(
  body: unknown,
  allowedFields: string[],
): ValidationResult<Record<string, unknown>> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const unknownField = Object.keys(record).find(
    (key) => !allowedFields.includes(key),
  );

  if (unknownField !== undefined) {
    return { ok: false, error: `Unknown field: ${unknownField}` };
  }

  return { ok: true, value: record };
}

function validateTitle(value: unknown): ValidationResult<string> {
  if (value === undefined) return { ok: false, error: "Title is required" };
  if (typeof value !== "string") {
    return { ok: false, error: "Title must be a string" };
  }

  const title = value.trim();
  if (title.length === 0) return { ok: false, error: "Title is required" };
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer`,
    };
  }

  return { ok: true, value: title };
}

function validateDescription(
  value: unknown,
): ValidationResult<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Description must be a string or null" };
  }
  if (value.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
    };
  }

  return { ok: true, value: value.trim() };
}

function validateDueDate(value: unknown): ValidationResult<string | null> {
  // An empty string from an untouched <input type="date"> means "no due date".
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Due date must be a string or null" };
  }
  if (!isValidDateString(value)) {
    return { ok: false, error: "Due date must be a valid date in YYYY-MM-DD format" };
  }

  return { ok: true, value };
}

function validateCompleted(value: unknown): ValidationResult<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, error: "Completed must be a boolean" };
  }

  return { ok: true, value };
}

/** Validates the body of `POST /api/tasks`. */
export function validateCreateTask(
  body: unknown,
): ValidationResult<CreateTaskInput> {
  const shape = validateShape(body, CREATE_FIELDS);
  if (!shape.ok) return shape;

  const title = validateTitle(shape.value.title);
  if (!title.ok) return title;

  const description = validateDescription(shape.value.description);
  if (!description.ok) return description;

  const dueDate = validateDueDate(shape.value.dueDate);
  if (!dueDate.ok) return dueDate;

  return {
    ok: true,
    value: { title: title.value, description: description.value, dueDate: dueDate.value },
  };
}

/** Validates the body of `PATCH /api/tasks/:id`. */
export function validateUpdateTask(
  body: unknown,
): ValidationResult<UpdateTaskInput> {
  const shape = validateShape(body, UPDATE_FIELDS);
  if (!shape.ok) return shape;

  if (Object.keys(shape.value).length === 0) {
    return { ok: false, error: "At least one field must be provided" };
  }

  const input: UpdateTaskInput = {};

  if (shape.value.title !== undefined) {
    const title = validateTitle(shape.value.title);
    if (!title.ok) return title;
    input.title = title.value;
  }

  if (shape.value.description !== undefined) {
    const description = validateDescription(shape.value.description);
    if (!description.ok) return description;
    input.description = description.value;
  }

  if (shape.value.dueDate !== undefined) {
    const dueDate = validateDueDate(shape.value.dueDate);
    if (!dueDate.ok) return dueDate;
    input.dueDate = dueDate.value;
  }

  if (shape.value.completed !== undefined) {
    const completed = validateCompleted(shape.value.completed);
    if (!completed.ok) return completed;
    input.completed = completed.value;
  }

  return { ok: true, value: input };
}
