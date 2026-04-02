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
  initial?: SpaceGroup | null;
  spaces: Space[];
  onClose: () => void;
  onSave: (
    data: Pick<SpaceGroup, "name" | "description" | "color" | "spaceIds">,
  ) => void;
}

export function GroupForm({
  open,
  initial,
  spaces,
  onClose,
  onSave,
}: GroupFormProps) {
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
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      spaceIds: selectedSpaceIds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Group" : "New Group"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update the name, description, color, and spaces in the group."
              : "Create a group of spaces that launch together on separate virtual desktops."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Work Setup"
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
            <Label>Spaces</Label>
            {spaces.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No spaces available. Create a space first.
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                {spaces.map((space) => (
                  <label
                    key={space.id}
                    className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpaceIds.includes(space.id)}
                      onChange={() => toggleSpace(space.id)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">{space.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {initial ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
