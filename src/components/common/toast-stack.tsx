export type ToastItem = {
  id: string;
  tone: "success" | "error";
  message: string;
};

export const ToastStack = ({ toasts }: { toasts: ToastItem[] }) => (
  <div className="pointer-events-none fixed right-3 top-3 z-[70] flex max-w-sm flex-col gap-2">
    {toasts.map((toast) => (
      <div
        className={`rounded-md border px-3 py-2 text-sm shadow-lg ${
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
        }`}
        key={toast.id}
      >
        {toast.message}
      </div>
    ))}
  </div>
);
