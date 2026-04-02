import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Space, SpaceGroup } from "@/types";
import { SPACE_COLORS } from "@/types";

interface GroupFormProps {
  open: boolean;
  spaces: Space[];
  initial?: SpaceGroup | null;
  onClose: () => void;
  onSave: (data: Pick<SpaceGroup, "name" | "description" | "color" | "spaceIds">, id?: string) => void;
}

export function GroupForm({ open, spaces, initial, onClose, onSave }: GroupFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setColor(initial.color);
      setSelectedSpaceIds(initial.spaceIds);
    } else {
      setName("");
      setDescription("");
      setColor("blue");
      setSelectedSpaceIds([]);
    }
  }, [initial, open]);

  function toggleSpace(id: string) {
    setSelectedSpaceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      { name: name.trim(), description: description.trim(), color, spaceIds: selectedSpaceIds },
      initial?.id
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Group" : "New Group"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update the name, description, and spaces in this group."
              : "Create a group to launch multiple spaces at once."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Daily Work Setup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-desc">Description</Label>
            <Textarea
              id="group-desc"
              placeholder="Optional description…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    c.class,
                    color === c.value
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110"
                      : "opacity-70 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Spaces in this group</Label>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border p-2">
              {spaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spaces available. Create some spaces first.</p>
              ) : (
                spaces.map((space) => (
                  <label
                    key={space.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpaceIds.includes(space.id)}
                      onChange={() => toggleSpace(space.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        COLOR_MAP[space.color] ?? "bg-muted-foreground"
                      )}
                    />
                    <span className="text-sm">{space.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {initial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
  yellow: "bg-yellow-500",
};
