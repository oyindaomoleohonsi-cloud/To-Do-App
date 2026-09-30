type StateMessageProps = {
  variant: "loading" | "empty" | "error";
  title: string;
  /** Optional extra line under the title. */
  description?: string;
  /** Only used by the error variant: a button to retry the failed request. */
  onRetry?: () => void;
};

const styles = {
  loading: "text-slate-500",
  empty: "text-slate-500",
  error: "text-red-600",
} as const;

/** Renders the loading, empty and error states so every list looks the same. */
export default function StateMessage({
  variant,
  title,
  description,
  onRetry,
}: StateMessageProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center"
      role={variant === "error" ? "alert" : "status"}
    >
      {variant === "loading" && (
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden="true"
        />
      )}

      <p className={`text-sm font-medium ${styles[variant]}`}>{title}</p>

      {description && <p className="text-xs text-slate-500">{description}</p>}

      {variant === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}
