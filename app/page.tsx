import TaskApp from "@/components/TaskApp";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          To-Do List
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a task, tick it off when it is done, and clear your head.
        </p>
      </header>

      <TaskApp />
    </main>
  );
}
