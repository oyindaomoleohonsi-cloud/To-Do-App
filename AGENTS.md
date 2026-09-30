# AGENTS.md

Instructions for AI agents (and humans) working in this repository.

## Project

A To-Do List web app. Users create tasks, view them, edit them, delete them, and
mark them complete. Each task can hold multiple notes. Tasks can have a due
date, and overdue tasks are highlighted in the UI.

## Stack

- **Next.js** (App Router) — file-system routing, React Server Components by default
- **TypeScript** — strict mode, no `any` in app code
- **Tailwind CSS** — all styling, no CSS modules or inline style objects
- **Vitest** — unit + API route tests
- **API routes** live under `app/api`

## Features

1. Create a task (title required, optional description, optional due date)
2. View a list of tasks
3. View a single task with its notes
4. Edit a task
5. Delete a task (and its notes)
6. Mark a task complete / incomplete
7. Add, edit and delete multiple notes on a task
8. Due dates with overdue highlighting

### Overdue rule (important, use it verbatim)

A task is **overdue** if and only if:

- it is **not completed**, **and**
- it has a due date, **and**
- the due date is **before today** (local date, `YYYY-MM-DD` compared as strings).

Explicitly:

- A task due **today** is **not** overdue.
- A task due **yesterday** or earlier **is** overdue (only while not completed).
- A **completed** task is **never** overdue, no matter its due date.
- A task with **no** due date is **never** overdue.

Put this logic in one shared helper (e.g. `lib/tasks.ts`) and reuse it from both the
UI and the API. Do not re-implement the comparison inline in components.

## Project layout

```
app/
  layout.tsx
  page.tsx                  # task list
  tasks/[id]/page.tsx       # single task + notes
  api/
    tasks/route.ts          # GET (list), POST (create)
    tasks/[id]/route.ts     # GET, PATCH, DELETE
    tasks/[id]/notes/route.ts        # GET, POST
    tasks/[id]/notes/[noteId]/route.ts  # PATCH, DELETE
components/
  TaskList.tsx
  TaskItem.tsx
  TaskForm.tsx
  NoteList.tsx
  NoteForm.tsx
  StateMessage.tsx          # shared loading / empty / error UI
lib/
  tasks.ts                  # overdue logic, types, shared helpers
  validation.ts             # input validation
  api-client.ts             # fetch wrappers used by the UI
tests/
  api/tasks.test.ts
  api/notes.test.ts
```

Keep components small. One clear responsibility per file. If a component needs a
long `if` ladder, extract the logic into `lib/`.

## Code style rules

- **Keep it simple.** Prefer the obvious implementation over a clever one. No
  state libraries, no data-fetching libraries, no ORM unless asked.
- **Small components, clear names.** `TaskItem`, not `TaskRowComponent2`.
- **TypeScript everywhere.** Type props and API payloads explicitly.
- **Server Components by default.** Add `"use client"` only where you need
  `useState`, `useEffect` or event handlers.
- Format with the repo's formatter if one exists; otherwise match the
  surrounding file style.

### API rules

- **Validate every input** on the server. Never trust the client.
- Return **proper status codes**:
  - `200` OK — read/update success
  - `201` Created — successful create
  - `400` Bad Request — invalid input (missing/blank fields, bad date format)
  - `404` Not Found — unknown task or note id
  - `405` Method Not Allowed — wrong verb on a route
- **Errors are always JSON** with this shape:

  ```json
  { "error": "Title is required" }
  ```

  Never return a bare string, HTML error page, or empty body from an API route.
- Reject unknown fields in request bodies. Do not silently drop them.
- Use `NextResponse.json(...)` for every response, success or failure.

### Environment variables and secrets

- **Never hard-code secrets, API keys, tokens, passwords, or connection strings.**
- Read config from `process.env` in one place (e.g. `lib/env.ts`) and validate it
  at startup.
- Keep a committed `.env.example` listing every variable name the app needs, with
  placeholder values and comments. It must contain **no real values**.
- `.env`, `.env.local` and any real credentials stay out of git (`.gitignore`).
- When you add a variable: add it to `.env.example` in the same change, and
  mention it in the summary.

### UI rules

- **The UI calls the API routes with `fetch`.** No direct database access from
  components, no server actions standing in for the required API routes.
- `fetch` from the browser for mutations; use relative URLs like
  `/api/tasks/${id}`.
- Every list (tasks, notes) must render **all three states**:
  1. **Loading** — a spinner or skeleton, not a blank area
  2. **Empty** — a friendly message, e.g. "No tasks yet. Add your first one."
  3. **Error** — the error message plus a "Try again" action
- Show clear feedback after a create/update/delete, including failures.
- Use the shared `StateMessage` component so these states look consistent.

### Mobile rules

- The app must work well on small screens first (assume ~360px wide).
- Use responsive Tailwind classes; verify there is **no horizontal scrolling**.
- Tap targets should be at least 44×44px on touch devices.
- Forms stack vertically on mobile; inputs use `w-full`.
- Never hide core functionality (delete, complete, notes) on mobile.

## Testing rules

- **Every endpoint created must have tests.** If you add a route, add tests for it
  in the same change.
- Use **Vitest**. Test API route handlers directly (call the exported
  `GET`/`POST`/`PATCH`/`DELETE` with a `Request` and assert on the `Response`).
- For each endpoint cover at minimum:
  - happy path
  - invalid input → `400`
  - missing resource → `404`
- Also test the **overdue rule** directly, including the edge cases: due today is
  not overdue, completed is never overdue, no due date is never overdue.
- **Always run the tests before reporting a task as done.** Never claim tests pass
  without running them and seeing the output.

```bash
npm test          # run the suite
npm run test:watch
npx tsc --noEmit  # types must be clean
npm run lint
```

## Workflow

- **Make small changes.** One focused change at a time, not a large rewrite.
- **Explain each change simply**, in plain language, after making it. Say what
  changed, which files were touched, and why.
- If a change is not needed, do not make it.
- Do not add dependencies without saying why.
- Never delete or overwrite existing work you did not write without asking.

## Definition of done

A task is complete only when:

- [ ] The code is written and type-checks cleanly
- [ ] Every new/changed endpoint has tests
- [ ] `npm test` passes and you have seen the output
- [ ] `npm run lint` passes
- [ ] Loading, empty and error states exist for every list
- [ ] Mobile layout works
- [ ] Any new env var is in `.env.example`
- [ ] The changes are explained simply

## Storage

Tasks are stored in **SQLite** (a local file, no server to install).

- `lib/env.ts` reads `DATABASE_PATH` (defaults to `.data/tasks.db`). This is the
  only place that touches `process.env`.
- `lib/db.ts` owns the connection and the schema.
- `lib/repository.ts` implements the `TaskRepository` interface against SQLite.

Rules for storage code:

- **Open the connection lazily** via `getDatabase()`. Opening it while a module
  is imported makes every `next build` worker open the file at once, which
  deadlocks the build.
- Write column names as fixed literals and pass all values as SQL parameters.
- Sort newest first with `ORDER BY created_at DESC, rowid DESC` — `created_at`
  only has millisecond resolution, so equal timestamps tie otherwise.
- The database lives in `.data/`, which is gitignored. Never commit it.

To move to Postgres or another database, implement `TaskRepository` and change
the `taskRepository` export. Routes and the UI do not change.

## Current state

Built so far:

- Next.js App Router + TypeScript + Tailwind, with Vitest for tests.
- Task API: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`.
- Single-page UI with an add form, list, and complete/edit/delete actions.
- SQLite storage, so tasks survive a restart.
- **Notes are not built yet.** The note routes and the `tasks/[id]` page in the
  layout above are the next piece of work.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
