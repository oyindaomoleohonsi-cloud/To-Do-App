import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    // API route handlers are plain Request -> Response functions, so no DOM needed.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Removes the throwaway database before any worker opens it.
    globalSetup: ["tests/global-setup.ts"],
    // Tests use a throwaway database file so they never touch your real data.
    // A file is used rather than ":memory:" so the persistence test can open a
    // second connection to it and prove the data was really written to disk.
    env: { DATABASE_PATH: ".data/test-tasks.db" },
  },
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
});
