import { create } from "zustand";

export type UiTone = "info" | "success" | "warning" | "danger";

export type Toast = {
  id: string;
  tone: UiTone;
  title: string;      
  message?: string;
  ttlMs?: number;
};


export type ConfirmRequest = {
  id: string;
  tone: UiTone;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
};

type UiState = {
  toasts: Toast[];
  confirm: ConfirmRequest | null;

  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  confirmAsync: (req: Omit<ConfirmRequest, "id">) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
};

function uid(prefix = "ui") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

let confirmResolver: ((ok: boolean) => void) | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  confirm: null,

  toast: (t) => {
    const id = uid("toast");
    const ttl = t.ttlMs ?? 4500;

    set((s) => ({ toasts: [...s.toasts, { ...t, id, ttlMs: ttl }] }));

    // auto-dismiss
    window.setTimeout(() => {
      get().dismissToast(id);
    }, ttl);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },

  clearToasts: () => set({ toasts: [] }),

  confirmAsync: async (req) => {
    const id = uid("confirm");

    // tylko jedna prośba na raz (MVP)
    set({ confirm: { ...req, id } });

    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
    });
  },

  resolveConfirm: (ok) => {
    set({ confirm: null });
    if (confirmResolver) {
      const r = confirmResolver;
      confirmResolver = null;
      r(ok);
    }
  },
}));
