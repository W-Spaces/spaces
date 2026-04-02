import {
  Plus,
  Rocket,
  Layers,
  Star,
  Folder,
  Play,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Space, SpaceGroup } from "@/types";

interface SpacesSidebarProps {
  spaces: Space[];
  groups: SpaceGroup[];
  selectedId: string | null;
  selectedGroupId: string | null;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
  onNew: () => void;
  onNewGroup: () => void;
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

export function SpacesSidebar({
  spaces,
  groups,
  selectedId,
  selectedGroupId,
  onSelect,
  onSelectGroup,
  onNew,
  onNewGroup,
}: SpacesSidebarProps) {
  const sorted = [...spaces].sort((a, b) => {
    if (a.isFavourite === b.isFavourite) return 0;
    return a.isFavourite ? -1 : 1;
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <Layers className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold tracking-tight">Spaces</span>
      </div>

      <Separator />

      {/* Group list */}
      {groups.length > 0 && (
        <>
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Groups
            </span>
          </div>
          <ScrollArea className="max-h-40">
            <div className="space-y-1 px-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left",
                    selectedGroupId === group.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{group.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {group.spaceIds.length}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <Separator className="my-2" />
        </>
      )}

      {/* Space list */}
      <div className="px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Spaces
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {spaces.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No spaces yet.
              <br />
              Create one to get started.
            </p>
          )}
          {sorted.map((space) => (
            <button
              key={space.id}
              onClick={() => onSelect(space.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left",
                selectedId === space.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  COLOR_MAP[space.color] ?? "bg-muted-foreground",
                )}
              />
              <span className="truncate font-medium">{space.name}</span>
              {space.isFavourite && (
                <Star className="ml-auto h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
              )}
              <span
                className={cn(
                  "shrink-0 text-xs text-muted-foreground",
                  space.isFavourite ? "" : "ml-auto",
                )}
              >
                {space.items.length}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="flex gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={onNewGroup}
        >
          <Folder className="h-4 w-4" />
          Group
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          Space
        </Button>
      </div>

      {/* Branding */}
      <div className="flex items-center gap-1.5 px-4 py-2">
        <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">spaces v0.1.0</span>
      </div>
    </aside>
  );
}
