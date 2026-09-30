import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { taskRepository } from "@/lib/repository";
import { toTaskWithOverdue } from "@/lib/tasks";
import { validateCreateTask } from "@/lib/validation";

/** GET /api/tasks — list every task, newest first. */
export async function GET() {
  const tasks = taskRepository.list().map((task) => toTaskWithOverdue(task));

  return jsonOk({ tasks });
}

/** POST /api/tasks — create a task. */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return jsonError(400, body.error);

  const result = validateCreateTask(body.value);
  if (!result.ok) return jsonError(400, result.error);

  const task = taskRepository.create(result.value);

  return jsonOk({ task: toTaskWithOverdue(task) }, 201);
}
