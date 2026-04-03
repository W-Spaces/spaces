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
import { SPACE_ICON_MAP } from "@/lib/icons";
import type { Space } from "@/types";
import { SPACE_COLORS, SPACE_ICONS } from "@/types";

interface SpaceFormProps {
  open: boolean;
  initial?: Space | null;
  onClose: () => void;
  onSave: (data: Pick<Space, "name" | "description" | "color" | "icon">) => void;
}

export function SpaceForm({ open, initial, onClose, onSave }: SpaceFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("Rocket");

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setColor(initial.color);
      setIcon(initial.icon ?? "Rocket");
    } else {
      setName("");
      setDescription("");
      setColor("blue");
      setIcon("Rocket");
    }
  }, [initial, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color, icon });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Space" : "New Space"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update the name, description, and color of the space."
              : "Give your workspace configuration a name and description."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              placeholder="e.g. Main Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="space-desc">Description</Label>
            <Textarea
              id="space-desc"
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
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {SPACE_ICONS.map((iconName) => {
                const IconComponent = SPACE_ICON_MAP[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    aria-label={iconName}
                    title={iconName}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                      icon === iconName
                        ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-1 ring-offset-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {initial ? "Save Changes" : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
