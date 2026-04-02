import { Plus, Rocket, Layers, FolderOpen } from "lucide-react";
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
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <Layers className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold tracking-tight">Spaces</span>
      </div>

      <Separator />

      {/* Space list + Groups list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {spaces.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No spaces yet.
              <br />
              Create one to get started.
            </p>
          )}
          {spaces.map((space) => (
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
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {space.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Groups section */}
        <div className="px-2 pb-2">
          <div className="flex items-center gap-1.5 px-3 py-2">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Groups
            </span>
          </div>
          {groups.length === 0 ? (
            <p className="px-3 pb-4 text-center text-xs text-muted-foreground">
              No groups yet.
            </p>
          ) : (
            groups.map((group) => (
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
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    COLOR_MAP[group.color] ?? "bg-muted-foreground",
                  )}
                />
                <span className="truncate font-medium">{group.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {group.spaceIds.length}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="flex flex-col gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Space
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onNewGroup}
        >
          <Plus className="h-4 w-4" />
          New Group
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

