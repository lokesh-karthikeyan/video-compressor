import { MAX_VISIBLE_TOASTS, TOAST_DURATION } from "$lib/constants";
import type { Toast, ToastType } from "$lib/types";
import { writable } from "svelte/store";

let nextId = 0;

function createToastStore() {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  const { subscribe, update } = writable<Toast[]>([]);

  function dismiss(id: number): void {
    clearTimeout(timers.get(id));
    timers.delete(id);
    update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  function scheduleDismiss(id: number): void {
    clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        dismiss(id);
      }, TOAST_DURATION),
    );
  }

  return {
    subscribe,

    show: (message: string, type: ToastType = "info") => {
      const id = nextId++;

      let droppedIds: number[] = [];
      update((toasts) => {
        const next = [...toasts, { id, message, type }];
        if (next.length <= MAX_VISIBLE_TOASTS) return next;
        droppedIds = next.slice(0, next.length - MAX_VISIBLE_TOASTS).map((t) => t.id);
        return next.slice(-MAX_VISIBLE_TOASTS);
      });
      for (const droppedId of droppedIds) dismiss(droppedId);

      scheduleDismiss(id);
    },

    pause: (id: number) => clearTimeout(timers.get(id)),

    resume: (id: number) => scheduleDismiss(id),

    dismiss,
  };
}

export const toasts = createToastStore();
