import { useState } from "react";
import {
  Terminal,
  Globe,
  AppWindow,
  Code2,
  Pencil,
  Trash2,
  Plus,
  Rocket,
  MoreHorizontal,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Monitor,
  Maximize2,
  Star,
} from "lucide-react";
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
import { MonitorLayout } from "@/components/MonitorLayout";
import { useMonitors } from "@/hooks/useMonitors";
import type { Space, SpaceItem, SpaceItemType, WindowPlacement } from "@/types";
import { ITEM_TYPE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { SPACE_ICON_MAP } from "@/lib/icons";

const ITEM_ICONS: Record<SpaceItemType, React.ReactNode> = {
  application: <AppWindow className="h-4 w-4" />,
  terminal: <Terminal className="h-4 w-4" />,
  url: <Globe className="h-4 w-4" />,
  script: <Code2 className="h-4 w-4" />,
};

const ITEM_COLORS: Record<SpaceItemType, string> = {
  application: "text-blue-400 bg-blue-400/10",
  terminal: "text-green-400 bg-green-400/10",
  url: "text-purple-400 bg-purple-400/10",
  script: "text-orange-400 bg-orange-400/10",
};

const MONITOR_DOT: Record<SpaceItemType, string> = {
  application: "bg-blue-500",
  terminal: "bg-green-500",
  url: "bg-purple-500",
  script: "bg-orange-500",
};

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

function itemSubtitle(item: SpaceItem): string {
  switch (item.type) {
    case "application":
      return item.path || "No path set";
    case "terminal":
      return item.cwd ? `in ${item.cwd}` : "No working directory";
    case "url":
      return item.url || "No URL set";
    case "script":
      return `${item.shell.toUpperCase()} script`;
  }
}

interface SpaceDetailProps {
  space: Space;
  isLaunching: boolean;
  onLaunch: (id: string) => void;
  onEdit: (space: Space) => void;
  onDelete: (id: string) => void;
  onToggleFavourite: (id: string) => void;
  onAddItem: () => void;
  onEditItem: (item: SpaceItem) => void;
  onDeleteItem: (itemId: string) => void;
  onReorder: (newItems: SpaceItem[]) => void;
  onPlacementChange: (
    itemId: string,
    placement: WindowPlacement | undefined,
  ) => void;
  onPlaceWindows: () => void;
}

export function SpaceDetail({
  space,
  isLaunching,
  onLaunch,
  onEdit,
  onDelete,
  onToggleFavourite,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorder,
  onPlacementChange,
  onPlaceWindows,
}: SpaceDetailProps) {
  const monitors = useMonitors();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteSpace, setDeleteSpace] = useState(false);

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= space.items.length) return;
    const next = [...space.items];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <div className="flex h-full flex-col">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex items-start justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              COLOR_MAP[space.color] ?? "bg-muted",
            )}
          >
            {(() => {
              const SpaceIcon = SPACE_ICON_MAP[space.icon ?? "Rocket"] ?? Rocket;
              return <SpaceIcon className="h-5 w-5 text-white" />;
            })()}
          </span>
          <div>
            <h1 className="text-xl font-semibold">{space.name}</h1>
            {space.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {space.description}
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
                onClick={() => onToggleFavourite(space.id)}
                aria-label={space.isFavourite ? "Unmark as favourite" : "Mark as favourite"}
                className={cn(
                  space.isFavourite && "border-yellow-400/50 bg-yellow-400/10 text-yellow-500 hover:bg-yellow-400/20",
                )}
              >
                <Star className={cn("h-4 w-4", space.isFavourite && "fill-current")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{space.isFavourite ? "Unmark as favourite" : "Mark as favourite"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(space)}
                aria-label="Edit space"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit space</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteSpace(true)}
                aria-label="Delete space"
                className="hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete space</TooltipContent>
          </Tooltip>
          <Button
            onClick={() => onLaunch(space.id)}
            disabled={isLaunching || space.items.length === 0}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            {isLaunching ? "Launchingâ€¦" : "Launch"}
          </Button>
          <Button
            variant="outline"
            onClick={onPlaceWindows}
            disabled={space.items.length === 0}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Place Windows
          </Button>{" "}
        </div>
      </header>

      <Separator />

      {/* â”€â”€ Monitor layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="px-8 py-4">
        <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          Monitor Layout
        </div>
        <MonitorLayout
          monitors={monitors}
          items={space.items}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          onPlacementChange={onPlacementChange}
        />
      </div>

      <Separator />

      {/* â”€â”€ Items list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {space.items.length} window{space.items.length !== 1 ? "s" : ""}
            </span>
            {Object.entries(
              space.items.reduce<Partial<Record<SpaceItemType, number>>>(
                (acc, item) => ({
                  ...acc,
                  [item.type]: (acc[item.type] ?? 0) + 1,
                }),
                {},
              ),
            ).map(([type, count]) => (
              <Badge
                key={type}
                variant="secondary"
                className="gap-1 font-normal"
              >
                {ITEM_ICONS[type as SpaceItemType]}
                {count} {ITEM_TYPE_LABELS[type as SpaceItemType]}
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onAddItem}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-8 py-3">
          {space.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MoreHorizontal className="mb-4 h-10 w-10 text-muted-foreground/20" />
              <p className="font-medium">No windows yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add applications, terminals, URLs or scripts to launch together.
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={onAddItem}
              >
                <Plus className="h-4 w-4" />
                Add first window
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {space.items.map((item, idx) => {
                const isSelected = item.id === selectedItemId;
                const monitorIdx = item.placement?.monitorIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedItemId(isSelected ? null : item.id)
                    }
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card hover:bg-accent/30",
                    )}
                  >
                    {/* Drag handle (visual only â€” reorder via arrows) */}
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />

                    {/* Type icon */}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        ITEM_COLORS[item.type],
                      )}
                    >
                      {ITEM_ICONS[item.type]}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {itemSubtitle(item)}
                      </p>
                    </div>

                    {/* Monitor badge */}
                    {monitorIdx !== undefined ? (
                      <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            MONITOR_DOT[item.type],
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          Monitor {monitorIdx + 1}
                        </span>
                      </div>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground/40">
                        unplaced
                      </span>
                    )}

                    {/* Reorder arrows */}
                    <div className="flex shrink-0 flex-col gap-px opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="rounded-sm p-0.5 hover:bg-accent disabled:opacity-20"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, -1);
                        }}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        className="rounded-sm p-0.5 hover:bg-accent disabled:opacity-20"
                        disabled={idx === space.items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, 1);
                        }}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                        aria-label="Edit item"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItemId(item.id);
                        }}
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* â”€â”€ Delete item dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog
        open={!!deleteItemId}
        onOpenChange={(o) => !o && setDeleteItemId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete window?</DialogTitle>
            <DialogDescription>
              This will permanently remove the item from the space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteItemId) onDeleteItem(deleteItemId);
                setDeleteItemId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Delete space dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={deleteSpace} onOpenChange={setDeleteSpace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{space.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently delete the space and all its windows. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSpace(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(space.id);
                setDeleteSpace(false);
              }}
            >
              Delete Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
