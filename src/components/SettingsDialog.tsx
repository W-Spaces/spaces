import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Plus, X, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AppSettings {
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  defaultShell: "powershell" | "cmd" | "wt";
  autoSaveInterval: number; // seconds, 0 = disabled
  appSearchPaths: string[];
  configPath: string; // custom config directory path (empty = default)
}

const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: false,
  minimizeToTray: false,
  defaultShell: "powershell",
  autoSaveInterval: 30,
  appSearchPaths: [
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\Users\\Default\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs",
  ],
  configPath: "",
};

const STORAGE_KEY = "spaces-app-settings";

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
    }
  }, [open]);

  function handleChange<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }

  function handleReset() {
    const defaults = DEFAULT_SETTINGS;
    saveSettings(defaults);
    setSettings(defaults);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-[75vw] flex flex-col"
        style={{ maxWidth: "75vw" }}
      >
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Configure how Spaces behaves on your system.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-4">
            {/* Launch on startup */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="launch-startup" className="text-sm font-medium">
                  Launch on startup
                </Label>
                <p className="text-xs text-muted-foreground">
                  Start Spaces when you log in to Windows.
                </p>
              </div>
              <Toggle
                id="launch-startup"
                checked={settings.launchOnStartup}
                onCheckedChange={(v) => handleChange("launchOnStartup", v)}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Minimize to tray */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="minimize-tray" className="text-sm font-medium">
                  Minimize to tray
                </Label>
                <p className="text-xs text-muted-foreground">
                  Keep Spaces running in the system tray when closed.
                </p>
              </div>
              <Toggle
                id="minimize-tray"
                checked={settings.minimizeToTray}
                onCheckedChange={(v) => handleChange("minimizeToTray", v)}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Default shell */}
            <div className="space-y-1.5">
              <Label htmlFor="default-shell" className="text-sm font-medium">
                Default shell
              </Label>
              <p className="text-xs text-muted-foreground">
                Shell used when adding new terminal items.
              </p>
              <select
                id="default-shell"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                value={settings.defaultShell}
                onChange={(e) =>
                  handleChange(
                    "defaultShell",
                    e.target.value as AppSettings["defaultShell"],
                  )
                }
              >
                <option value="powershell">PowerShell</option>
                <option value="cmd">Command Prompt (cmd)</option>
                <option value="wt">Windows Terminal (wt)</option>
              </select>
            </div>

            <div className="h-px bg-border" />

            {/* Auto-save interval */}
            <div className="space-y-1.5">
              <Label htmlFor="auto-save" className="text-sm font-medium">
                Auto-save interval
              </Label>
              <p className="text-xs text-muted-foreground">
                Periodically save spaces config. Set to 0 to disable.
              </p>
              <select
                id="auto-save"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                value={settings.autoSaveInterval}
                onChange={(e) =>
                  handleChange("autoSaveInterval", Number(e.target.value))
                }
              >
                <option value={0}>Disabled</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>

            <div className="h-px bg-border" />

            {/* App search paths */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  App search directories
                </Label>
                <p className="text-xs text-muted-foreground">
                  Directories scanned when discovering apps. Remove built-in
                  paths to hide them from search results.
                </p>
              </div>

              <div className="space-y-1.5">
                {settings.appSearchPaths.map((path, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{path}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        const next = settings.appSearchPaths.filter(
                          (_, i) => i !== index,
                        );
                        handleChange("appSearchPaths", next);
                      }}
                      title="Remove directory"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <AddPathInput
                paths={settings.appSearchPaths}
                onAdd={(path) =>
                  handleChange("appSearchPaths", [
                    ...settings.appSearchPaths,
                    path,
                  ])
                }
              />
            </div>

            <div className="h-px bg-border" />

            {/* Config path */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  Config save location
                </Label>
                <p className="text-xs text-muted-foreground">
                  Directory where spaces.json and groups.json are saved. Leave
                  empty to use the default AppData location.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex-1 truncate rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground">
                  {settings.configPath || "Default (AppData)"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={async () => {
                    try {
                      const path = await invoke<string | null>(
                        "pick_config_dir",
                      );
                      if (path) {
                        handleChange("configPath", path);
                      }
                    } catch (e) {
                      console.error("Failed to pick folder:", e);
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                  Browse
                </Button>
                {settings.configPath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => handleChange("configPath", "")}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 shrink-0">
            <Button variant="outline" onClick={handleReset}>
              Reset to defaults
            </Button>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function AddPathInput({
  paths,
  onAdd,
}: {
  paths: string[];
  onAdd: (path: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    // Only add if not already in the list
    if (!paths.includes(trimmed)) {
      onAdd(trimmed);
    }
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        placeholder="C:\Program Files\My App"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={!value.trim()}
      >
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}

export function getSettings(): AppSettings {
  return loadSettings();
}
