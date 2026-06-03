"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/types";
import ItemForm from "@/components/ItemForm";

type ModalState = { mode: "add" } | { mode: "edit"; item: Item } | null;

type ModalApi = {
  openAdd: () => void;
  openEdit: (item: Item) => void;
};

const Ctx = createContext<ModalApi | null>(null);

// Pages/components call this to open the add/edit modal.
export function useItemModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useItemModal must be used inside ItemModalProvider");
  return c;
}

// Pages that show item lists can listen for this to re-fetch after a save.
export const ITEMS_CHANGED = "wardrobe:items-changed";

export default function ItemModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>(null);
  const router = useRouter();

  const close = () => setState(null);

  // After a successful save: close, refresh server data, and tell client lists.
  const onSaved = () => {
    close();
    router.refresh();
    window.dispatchEvent(new Event(ITEMS_CHANGED));
  };

  // Lock background scroll while the modal is open; allow Esc to close.
  useEffect(() => {
    if (!state) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [state]);

  return (
    <Ctx.Provider
      value={{
        openAdd: () => setState({ mode: "add" }),
        openEdit: (item) => setState({ mode: "edit", item }),
      }}
    >
      {children}

      {state && (
        <div className="fixed inset-0 z-40 overflow-y-auto p-4 flex items-start justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative z-10 w-full max-w-lg my-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-white font-semibold text-lg">
                {state.mode === "add" ? "Add item" : "Edit item"}
              </h2>
              <button
                onClick={close}
                aria-label="Close"
                className="grid place-items-center w-9 h-9 rounded-full text-white/85 hover:text-white hover:bg-white/10 text-lg"
              >
                ✕
              </button>
            </div>
            <ItemForm
              initial={state.mode === "edit" ? state.item : undefined}
              onSaved={onSaved}
              onCancel={close}
            />
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
