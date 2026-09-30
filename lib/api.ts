import { NextResponse } from "next/server";

/** Success response. */
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Error response. Always `{ "error": "..." }` with the given status. */
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Parses a JSON request body, turning malformed JSON into a 400 instead of an
 * unhandled exception.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, error: "Request body must be valid JSON" };
  }
}
