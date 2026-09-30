import fs from "node:fs";
import path from "node:path";

/**
 * Runs once before any test worker starts, in the main process.
 *
 * Test files run in parallel workers and all share one SQLite file, so the file
 * is deleted here — while nothing has it open yet — rather than in a test's
 * beforeAll/afterAll, which would fail on Windows with EBUSY.
 */
const databaseDirectory = path.resolve(process.cwd(), ".data");

/** Runs once in the main process before any test worker starts. */
export function setup() {
  fs.rmSync(databaseDirectory, { recursive: true, force: true });
}
