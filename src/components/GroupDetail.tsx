import { useState } from "react";
import { Pencil, Trash2, Rocket, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Space, SpaceGroup } from "@/types";
import { cn } from "@/lib/utils";

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

interface GroupDetailProps {
  group: SpaceGroup;
  spaces: Space[];
  isLaunching: boolean;
  onLaunch: (id: string) => void;
  onEdit: (group: SpaceGroup) => void;
  onDelete: (id: string) => void;
}

export function GroupDetail({
  group,
  spaces,
  isLaunching,
  onLaunch,
  onEdit,
  onDelete,
}: GroupDetailProps) {
  const [deleteGroup, setDeleteGroup] = useState(false);

  const groupSpaces = group.spaceIds
    .map((id) => spaces.find((s) => s.id === id))
    .filter((s): s is Space => s !== undefined);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-start justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              COLOR_MAP[group.color] ?? "bg-muted",
            )}
          >
            <Layers className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{group.name}</h1>
            {group.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(group)}
                aria-label="Edit group"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit group</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteGroup(true)}
                aria-label="Delete group"
                className="hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete group</TooltipContent>
          </Tooltip>
          <Button
            onClick={() => onLaunch(group.id)}
            disabled={isLaunching || group.spaceIds.length === 0}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            {isLaunching ? "Launching…" : "Launch Group"}
          </Button>
        </div>
      </header>

      <Separator />

      {/* Spaces list */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center px-8 py-3">
          <span className="text-sm text-muted-foreground">
            {group.spaceIds.length} space
            {group.spaceIds.length !== 1 ? "s" : ""} — each launches on its own
            virtual desktop
          </span>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-8 py-3">
          {groupSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="mb-4 h-10 w-10 text-muted-foreground/20" />
              <p className="font-medium">No spaces in this group</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit the group to add spaces.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {groupSpaces.map((space) => (
                <div
                  key={space.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      COLOR_MAP[space.color] ?? "bg-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{space.name}</p>
                    {space.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {space.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {space.items.length} item
                    {space.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Delete group dialog */}
      <Dialog open={deleteGroup} onOpenChange={setDeleteGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{group.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently delete the group. The spaces within it will
              not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroup(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(group.id);
                setDeleteGroup(false);
              }}
            >
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
