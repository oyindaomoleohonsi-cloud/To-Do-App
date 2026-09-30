import path from "node:path";

/**
 * All environment configuration is read here, in one place, so the rest of the
 * app never touches `process.env` directly. No secrets are stored in the repo.
 */

/** Where the SQLite file lives. Set `DATABASE_PATH` to override it. */
function readDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();

  // ":memory:" is a special SQLite name and must be used exactly as written.
  if (configured === ":memory:") return configured;

  // The location comes from DATABASE_PATH at runtime, so it cannot be known at
  // build time. Without this hint, Turbopack traces the whole project into the
  // server bundle instead of just this file.
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    configured || ".data/tasks.db",
  );
}

export const DATABASE_PATH = readDatabasePath();

/** True when the app is running against a throwaway in-memory database. */
export const isInMemoryDatabase = DATABASE_PATH === ":memory:";
