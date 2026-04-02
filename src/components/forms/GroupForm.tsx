import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

          <div className="space-y-3">
            <div className="pb-1">
              <Label>Color</Label>
            </div>
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

          <Separator />

          <div className="space-y-2">
            <Label>Spaces in this group</Label>
            {spaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No spaces available. Create some spaces first.
              </p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">Select</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {spaces.map((space) => {
                      const isSelected = selectedSpaceIds.includes(space.id);
                      return (
                        <tr
                          key={space.id}
                          onClick={() => toggleSpace(space.id)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected ? "bg-accent" : "hover:bg-muted/50"
                          )}
                        >
                          <td className="px-3 py-2">
                            <div
                              className={cn(
                                "h-4 w-4 rounded border border-border flex items-center justify-center",
                                isSelected ? "bg-primary border-primary" : "bg-background"
                              )}
                            >
                              {isSelected && (
                                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-block h-3 w-3 rounded-full shrink-0",
                                  COLOR_MAP[space.color] ?? "bg-muted-foreground"
                                )}
                              />
                              <span className="font-medium">{space.name}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {selectedSpaceIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedSpaceIds.length} space{selectedSpaceIds.length !== 1 ? "s" : ""} selected
              </p>
            )}
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
