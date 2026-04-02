import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpacesSidebar } from "@/components/SpacesSidebar";
import { SpaceDetail } from "@/components/SpaceDetail";
import { SpaceForm } from "@/components/forms/SpaceForm";
import { ItemForm } from "@/components/forms/ItemForm";
import { WindowPlacementDialog } from "@/components/WindowPlacementDialog";
import { Layers } from "lucide-react";
import type { Space, SpaceItem, WindowPlacement } from "@/types";

export default function App() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Space form state
  const [spaceFormOpen, setSpaceFormOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  // Item form state
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SpaceItem | null>(null);

  // Window placement dialog state
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadSpaces = useCallback(async () => {
    try {
      const list = await invoke<Space[]>("get_spaces");
      setSpaces(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load spaces:", e);
    }
  }, [selectedId]);

  useEffect(() => {
    loadSpaces();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSpace = spaces.find((s) => s.id === selectedId) ?? null;

  function openNewSpace() {
    setEditingSpace(null);
    setSpaceFormOpen(true);
  }

  function openEditSpace(space: Space) {
    setEditingSpace(space);
    setSpaceFormOpen(true);
  }

  async function handleSaveSpace(
    data: Pick<Space, "name" | "description" | "color">,
  ) {
    try {
      const payload: Space = editingSpace
        ? { ...editingSpace, ...data }
        : {
            id: "",
            name: data.name,
            description: data.description,
            color: data.color,
            items: [],
            isFavourite: false,
            createdAt: "",
            updatedAt: "",
          };

      const saved = await invoke<Space>("save_space", { space: payload });
      setSpaces((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setSelectedId(saved.id);
      setSpaceFormOpen(false);
      setEditingSpace(null);
    } catch (e) {
      console.error("Failed to save space:", e);
    }
  }

  async function handleDeleteSpace(id: string) {
    try {
      await invoke("delete_space", { id });
      setSpaces((prev) => prev.filter((s) => s.id !== id));
      setSelectedId((prev) => {
        if (prev !== id) return prev;
        const remaining = spaces.filter((s) => s.id !== id);
        return remaining[0]?.id ?? null;
      });
    } catch (e) {
      console.error("Failed to delete space:", e);
    }
  }

  async function handleToggleFavourite(id: string) {
    try {
      const updated = await invoke<Space>("toggle_favourite", { id });
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) {
      console.error("Failed to toggle favourite:", e);
    }
  }

  async function handleLaunch(id: string) {
    setIsLaunching(true);
    try {
      await invoke("launch_space", { id });
    } catch (e) {
      console.error("Failed to launch space:", e);
      alert(`Launch failed: ${e}`);
    } finally {
      setIsLaunching(false);
    }
  }

  function openAddItem() {
    setEditingItem(null);
    setItemFormOpen(true);
  }

  function openEditItem(item: SpaceItem) {
    setEditingItem(item);
    setItemFormOpen(true);
  }

  function openPlacementDialog() {
    setPlacementDialogOpen(true);
  }

  async function handleSaveItem(data: Omit<SpaceItem, "id">) {
    if (!selectedSpace) return;
    try {
      const newItem: SpaceItem = editingItem
        ? ({ ...data, id: editingItem.id } as SpaceItem)
        : ({ ...data, id: crypto.randomUUID() } as SpaceItem);

      const updatedItems = editingItem
        ? selectedSpace.items.map((it) =>
            it.id === editingItem.id ? newItem : it,
          )
        : [...selectedSpace.items, newItem];

      const updated: Space = { ...selectedSpace, items: updatedItems };
      const saved = await invoke<Space>("save_space", { space: updated });
      setSpaces((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      setItemFormOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error("Failed to save item:", e);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!selectedSpace) return;
    try {
      const updated: Space = {
        ...selectedSpace,
        items: selectedSpace.items.filter((it) => it.id !== itemId),
      };
      const saved = await invoke<Space>("save_space", { space: updated });
      setSpaces((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      console.error("Failed to delete item:", e);
    }
  }

  async function handleReorder(newItems: SpaceItem[]) {
    if (!selectedSpace) return;
    try {
      const updated: Space = { ...selectedSpace, items: newItems };
      const saved = await invoke<Space>("save_space", { space: updated });
      setSpaces((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      console.error("Failed to reorder items:", e);
    }
  }

  async function handlePlacementChange(
    itemId: string,
    placement: WindowPlacement | undefined,
  ) {
    if (!selectedSpace) return;
    try {
      const updated: Space = {
        ...selectedSpace,
        items: selectedSpace.items.map((it) =>
          it.id === itemId ? { ...it, placement } : it,
        ),
      };
      const saved = await invoke<Space>("save_space", { space: updated });
      setSpaces((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      console.error("Failed to update placement:", e);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <SpacesSidebar
          spaces={spaces}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={openNewSpace}
        />

        <main className="flex-1 overflow-hidden">
          {selectedSpace ? (
            <>
              <SpaceDetail
                space={selectedSpace}
                isLaunching={isLaunching}
                onLaunch={handleLaunch}
                onEdit={openEditSpace}
                onDelete={handleDeleteSpace}
                onToggleFavourite={handleToggleFavourite}
                onAddItem={openAddItem}
                onEditItem={openEditItem}
                onDeleteItem={handleDeleteItem}
                onReorder={handleReorder}
                onPlacementChange={handlePlacementChange}
                onPlaceWindows={openPlacementDialog}
              />

              <WindowPlacementDialog
                open={placementDialogOpen}
                items={selectedSpace?.items ?? []}
                activeItemId={selectedItemId}
                onClose={() => setPlacementDialogOpen(false)}
                onSelectItem={setSelectedItemId}
                onPlacementChange={handlePlacementChange}
              />
            </>
          ) : (
            <EmptyState onNew={openNewSpace} />
          )}
        </main>

        <SpaceForm
          open={spaceFormOpen}
          initial={editingSpace}
          onClose={() => {
            setSpaceFormOpen(false);
            setEditingSpace(null);
          }}
          onSave={handleSaveSpace}
        />

        <ItemForm
          open={itemFormOpen}
          initial={editingItem}
          onClose={() => {
            setItemFormOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
        />
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Layers className="h-16 w-16 text-muted-foreground/20" />
      <div>
        <h2 className="text-lg font-semibold">No space selected</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a space to group your apps, terminals and scripts.
        </p>
      </div>
      <button
        onClick={onNew}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Create your first space
      </button>
    </div>
  );
}
