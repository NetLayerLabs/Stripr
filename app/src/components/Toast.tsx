"use client";

import { ArrowUpRight, CircleCheck, CircleX, LoaderCircle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type ToastKind = "pending" | "success" | "error";

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  href?: string;
};

type ToastApi = {
  show: (toast: Omit<Toast, "id">) => number;
  update: (id: number, patch: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, kind: ToastKind) => {
      clearTimeout(timers.current.get(id));
      if (kind !== "pending") timers.current.set(id, setTimeout(() => dismiss(id), 7000));
    },
    [dismiss]
  );

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { ...toast, id }]);
      scheduleDismiss(id, toast.kind);
      return id;
    },
    [scheduleDismiss]
  );

  const update = useCallback(
    (id: number, patch: Partial<Omit<Toast, "id">>) => {
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, ...patch } : toast)));
      if (patch.kind) scheduleDismiss(id, patch.kind);
    },
    [scheduleDismiss]
  );

  const api = useMemo(() => ({ show, update, dismiss }), [show, update, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.kind === "success" ? CircleCheck : toast.kind === "error" ? CircleX : LoaderCircle;
  return (
    <div role="status" className="card flex animate-toast-in items-start gap-3 bg-ink-900/95 p-4 shadow-2xl">
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          toast.kind === "success" && "text-emerald-400",
          toast.kind === "error" && "text-rose-400",
          toast.kind === "pending" && "animate-spin text-zinc-400"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-sm text-zinc-400">{toast.description}</p> : null}
        {toast.href ? (
          <a
            href={toast.href}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200"
          >
            View transaction
            <ArrowUpRight className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
