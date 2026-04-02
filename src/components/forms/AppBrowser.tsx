import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiscoveredApp } from "@/types";

interface AppBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (app: DiscoveredApp) => void;
}

export function AppBrowser({ open, onClose, onSelect }: AppBrowserProps) {
  const [apps, setApps] = useState<DiscoveredApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    invoke<DiscoveredApp[]>("discover_apps")
      .then((result) => setApps(result))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q),
    );
  }, [apps, search]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Browse Apps</DialogTitle>
          <DialogDescription>
            Select an installed application to add.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search apps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-72">
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Discovering apps…
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No apps found.
            </p>
          ) : (
            <div className="space-y-1 p-1">
              {filtered.map((app) => (
                <button
                  key={app.path}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    onSelect(app);
                    onClose();
                  }}
                >
                  {app.iconBase64 ? (
                    <img
                      src={`data:image/png;base64,${app.iconBase64}`}
                      className="h-6 w-6 shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="h-6 w-6 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 text-left">
                    <div className="truncate font-medium">{app.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {app.path}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
