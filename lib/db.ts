import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DATABASE_PATH, isInMemoryDatabase } from "./env";

/**
 * Opens the SQLite connection and creates the tables if they do not exist.
 */
function connect(): Database.Database {
  if (!isInMemoryDatabase) {
    fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  }

  const database = new Database(DATABASE_PATH);

  // Wait rather than fail when another process (for example `next build`
  // running alongside `next dev`) holds the file for a moment.
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT,
      due_date    TEXT,
      completed   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at DESC);
  `);

  return database;
}

const globalScope = globalThis as typeof globalThis & {
  __database?: Database.Database;
};

/**
 * Returns the shared connection, opening it on first use.
 *
 * Opening is deliberately lazy. A module that opened the database while being
 * imported would do so in every worker `next build` starts, which makes them
 * contend for the same file. Caching on globalThis keeps hot-reloads in
 * `next dev` from opening a new connection on every edit.
 */
export function getDatabase(): Database.Database {
  if (!globalScope.__database) {
    globalScope.__database = connect();
  }

  return globalScope.__database;
}

/** The shape of a row in the `tasks` table. */
export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: number;
  created_at: string;
  updated_at: string;
};
