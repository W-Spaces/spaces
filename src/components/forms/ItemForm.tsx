import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, X, FolderSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SpaceItem, SpaceItemType, DiscoveredApp } from "@/types";

interface ItemFormProps {
  open: boolean;
  initial?: SpaceItem | null;
  onClose: () => void;
  onSave: (item: Omit<SpaceItem, "id">) => void;
}

export function ItemForm({ open, initial, onClose, onSave }: ItemFormProps) {
  const [type, setType] = useState<SpaceItemType>("application");
  const [name, setName] = useState("");

  // application
  const [appPath, setAppPath] = useState("");
  const [appArgs, setAppArgs] = useState<string[]>([]);
  const [argInput, setArgInput] = useState("");

  // app browser
  const [showAppBrowser, setShowAppBrowser] = useState(false);
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appSearch, setAppSearch] = useState("");

  // terminal
  const [termCwd, setTermCwd] = useState("");
  const [termShell, setTermShell] = useState<"wt" | "powershell" | "cmd">("wt");
  const [termCommands, setTermCommands] = useState("");

  // url
  const [urlValue, setUrlValue] = useState("");

  // script
  const [scriptContent, setScriptContent] = useState("");
  const [scriptShell, setScriptShell] = useState<"powershell" | "cmd">(
    "powershell",
  );
  const [scriptCwd, setScriptCwd] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setType(initial.type);
      setName(initial.name);
      if (initial.type === "application") {
        setAppPath(initial.path);
        setAppArgs(initial.args);
      } else if (initial.type === "terminal") {
        setTermCwd(initial.cwd);
        setTermShell(initial.shell);
        setTermCommands(initial.commands.join("\n"));
      } else if (initial.type === "url") {
        setUrlValue(initial.url);
      } else if (initial.type === "script") {
        setScriptContent(initial.content);
        setScriptShell(initial.shell);
        setScriptCwd(initial.cwd);
      }
    } else {
      setType("application");
      setName("");
      setAppPath("");
      setAppArgs([]);
      setArgInput("");
      setTermCwd("");
      setTermShell("wt");
      setTermCommands("");
      setUrlValue("");
      setScriptContent("");
      setScriptShell("powershell");
      setScriptCwd("");
    }
  }, [initial, open]);

  function addArg() {
    const trimmed = argInput.trim();
    if (trimmed) {
      setAppArgs((prev) => [...prev, trimmed]);
      setArgInput("");
    }
  }

  function removeArg(i: number) {
    setAppArgs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    let item: Omit<SpaceItem, "id">;
    switch (type) {
      case "application":
        item = { type, name: name.trim(), path: appPath.trim(), args: appArgs };
        break;
      case "terminal":
        item = {
          type,
          name: name.trim(),
          cwd: termCwd.trim(),
          shell: termShell,
          commands: termCommands
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
        };
        break;
      case "url":
        item = { type, name: name.trim(), url: urlValue.trim() };
        break;
      case "script":
        item = {
          type,
          name: name.trim(),
          content: scriptContent,
          shell: scriptShell,
          cwd: scriptCwd.trim(),
        };
        break;
    }
    onSave(item);
  }

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription>
            Configure what to launch when this space is activated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SpaceItemType)}
              disabled={!!initial}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="terminal">Terminal</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="script">Script</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              placeholder="e.g. VS Code"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* --- Application fields --- */}
          {type === "application" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="app-path">Executable Path</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={async () => {
                      setIsLoadingApps(true);
                      try {
                        const apps = await invoke<DiscoveredApp[]>("discover_apps");
                        setDiscoveredApps(apps);
                        setShowAppBrowser(true);
                      } catch (e) {
                        console.error("Failed to discover apps:", e);
                      } finally {
                        setIsLoadingApps(false);
                      }
                    }}
                  >
                    {isLoadingApps ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FolderSearch className="h-3 w-3" />
                    )}
                    Browse
                  </Button>
                </div>
                <Input
                  id="app-path"
                  placeholder="C:\Program Files\...\app.exe"
                  value={appPath}
                  onChange={(e) => setAppPath(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Arguments</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add argument…"
                    value={argInput}
                    onChange={(e) => setArgInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addArg())
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addArg}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {appArgs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {appArgs.map((arg, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
                      >
                        {arg}
                        <button
                          type="button"
                          onClick={() => removeArg(i)}
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* --- Terminal fields --- */}
          {type === "terminal" && (
            <>
              <div className="space-y-2">
                <Label>Shell</Label>
                <Select
                  value={termShell}
                  onValueChange={(v) =>
                    setTermShell(v as "wt" | "powershell" | "cmd")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wt">Windows Terminal</SelectItem>
                    <SelectItem value="powershell">PowerShell</SelectItem>
                    <SelectItem value="cmd">Command Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="term-cwd">Working Directory</Label>
                <Input
                  id="term-cwd"
                  placeholder="C:\Users\you\project"
                  value={termCwd}
                  onChange={(e) => setTermCwd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term-cmds">
                  Commands{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (one per line)
                  </span>
                </Label>
                <Textarea
                  id="term-cmds"
                  rows={4}
                  placeholder={"npm run dev\ngit status"}
                  value={termCommands}
                  onChange={(e) => setTermCommands(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          {/* --- URL fields --- */}
          {type === "url" && (
            <div className="space-y-2">
              <Label htmlFor="url-value">URL</Label>
              <Input
                id="url-value"
                type="url"
                placeholder="https://example.com"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
              />
            </div>
          )}

          {/* --- Script fields --- */}
          {type === "script" && (
            <>
              <div className="space-y-2">
                <Label>Shell</Label>
                <Select
                  value={scriptShell}
                  onValueChange={(v) =>
                    setScriptShell(v as "powershell" | "cmd")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="powershell">PowerShell</SelectItem>
                    <SelectItem value="cmd">Command Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="script-cwd">Working Directory</Label>
                <Input
                  id="script-cwd"
                  placeholder="C:\Users\you\project"
                  value={scriptCwd}
                  onChange={(e) => setScriptCwd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="script-content">Script Content</Label>
                <Textarea
                  id="script-content"
                  rows={6}
                  placeholder={
                    scriptShell === "powershell"
                      ? "Write-Host 'Hello'\n# your script here"
                      : "@echo off\necho Hello"
                  }
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          {/* App browser dialog */}
          {showAppBrowser && (
            <div className="rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border p-3">
                <Input
                  placeholder="Search apps..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAppBrowser(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-64">
                {discoveredApps.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    {isLoadingApps ? "Loading..." : "No apps found"}
                  </div>
                ) : (
                  <div className="p-1">
                    {discoveredApps
                      .filter((app) =>
                        app.name.toLowerCase().includes(appSearch.toLowerCase())
                      )
                      .slice(0, 50)
                      .map((app) => (
                        <button
                          key={app.path}
                          type="button"
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setAppPath(app.path);
                            setName(app.name);
                            setShowAppBrowser(false);
                          }}
                        >
                          {app.iconBase64 ? (
                            <img
                              src={`data:image/png;base64,${app.iconBase64}`}
                              alt={app.name}
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded bg-muted" />
                          )}
                          <span className="truncate">{app.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {initial ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
