import { useState } from "react";
import { Folder, Play, Pencil, Trash2, ArrowLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { Space, SpaceGroup } from "@/types";

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
  onBack: () => void;
}

export function GroupDetail({
  group,
  spaces,
  isLaunching,
  onLaunch,
  onEdit,
  onDelete,
  onBack,
}: GroupDetailProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get spaces in this group
  const groupSpaces = group.spaceIds
    .map((id) => spaces.find((s) => s.id === id))
    .filter((s): s is Space => s !== undefined);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-start justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              COLOR_MAP[group.color] ?? "bg-muted",
            )}
          >
            <Folder className="h-5 w-5 text-white" />
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
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete group</TooltipContent>
          </Tooltip>

          <Button
            onClick={() => onLaunch(group.id)}
            disabled={isLaunching || groupSpaces.length === 0}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Launch All
          </Button>
        </div>
      </header>

      <Separator />

      {/* Spaces in group */}
      <div className="flex-1 overflow-hidden px-8 py-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Spaces in this group ({groupSpaces.length})
        </h2>

        {groupSpaces.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No spaces in this group. Edit the group to add spaces.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupSpaces.map((space) => (
                <div
                  key={space.id}
                  className="flex flex-col rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          COLOR_MAP[space.color] ?? "bg-muted",
                        )}
                      >
                        <Rocket className="h-4 w-4 text-white" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{space.name}</h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {space.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {space.items.length} items
                    </Badge>
                    {space.items.slice(0, 3).map((item) => (
                      <Badge key={item.id} variant="outline" className="text-xs">
                        {item.type === "application" && item.name}
                        {item.type === "terminal" && `Terminal: ${item.name}`}
                        {item.type === "url" && `URL: ${item.name}`}
                        {item.type === "script" && `Script: ${item.name}`}
                      </Badge>
                    ))}
                    {space.items.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{space.items.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete(group.id);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
