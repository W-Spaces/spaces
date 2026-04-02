import { Plus, Rocket, Layers, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Space } from "@/types";

interface SpacesSidebarProps {
  spaces: Space[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
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
  selectedId,
  onSelect,
  onNew,
}: SpacesSidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <Layers className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold tracking-tight">Spaces</span>
      </div>

      <Separator />

      {/* Space list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {spaces.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No spaces yet.
              <br />
              Create one to get started.
            </p>
          )}
          {spaces
            .slice()
            .sort((a, b) => {
              // Sort favourites first
              if (a.isFavourite && !b.isFavourite) return -1;
              if (!a.isFavourite && b.isFavourite) return 1;
              return a.name.localeCompare(b.name);
            })
            .map((space) => (
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
                {space.isFavourite ? (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
                ) : (
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      COLOR_MAP[space.color] ?? "bg-muted-foreground",
                    )}
                  />
                )}
                <span className="truncate font-medium">{space.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {space.items.length}
                </span>
              </button>
            ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Space
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
