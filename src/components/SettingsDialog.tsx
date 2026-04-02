import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Space, SpaceGroup, StartupConfig } from "@/types";

interface SettingsDialogProps {
  open: boolean;
  spaces: Space[];
  groups: SpaceGroup[];
  onClose: () => void;
}

export function SettingsDialog({
  open,
  spaces,
  groups,
  onClose,
}: SettingsDialogProps) {
  const [startupConfig, setStartupConfig] = useState<StartupConfig | null>(null);
  const [startupType, setStartupType] = useState<"space" | "group" | "none">("none");
  const [startupId, setStartupId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStartupConfig();
    }
  }, [open]);

  async function loadStartupConfig() {
    try {
      const config = await invoke<StartupConfig | null>("get_startup_config");
      if (config) {
        setStartupConfig(config);
        setStartupType(config.type as "space" | "group");
        setStartupId(config.id);
      } else {
        setStartupConfig(null);
        setStartupType("none");
        setStartupId("");
      }
    } catch (e) {
      console.error("Failed to load startup config:", e);
    }
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      let config: StartupConfig | null = null;
      if (startupType !== "none" && startupId) {
        config = { type: startupType, id: startupId };
      }
      await invoke("set_startup_config", { config });
      onClose();
    } catch (e) {
      console.error("Failed to save startup config:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLaunchStartup() {
    setIsLoading(true);
    try {
      await invoke("launch_startup");
    } catch (e) {
      console.error("Failed to launch startup:", e);
      alert(`Launch failed: ${e}`);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedName =
    startupType === "space"
      ? spaces.find((s) => s.id === startupId)?.name
      : groups.find((g) => g.id === startupId)?.name;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your workspace preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Startup Configuration */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Startup Configuration</Label>
            <p className="text-sm text-muted-foreground">
              Select a space or group to launch automatically when the app starts.
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="startup-type" className="text-sm">
                  Launch at startup
                </Label>
                <Select
                  value={startupType}
                  onValueChange={(v) => {
                    setStartupType(v as "space" | "group" | "none");
                    setStartupId("");
                  }}
                >
                  <SelectTrigger id="startup-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="space" disabled={spaces.length === 0}>
                      Space ({spaces.length} available)
                    </SelectItem>
                    <SelectItem value="group" disabled={groups.length === 0}>
                      Group ({groups.length} available)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {startupType !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="startup-id" className="text-sm">
                    {startupType === "space" ? "Select Space" : "Select Group"}
                  </Label>
                  <Select value={startupId} onValueChange={setStartupId}>
                    <SelectTrigger id="startup-id">
                      <SelectValue placeholder={`Select a ${startupType}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {startupType === "space" &&
                        spaces.map((space) => (
                          <SelectItem key={space.id} value={space.id}>
                            {space.name}
                          </SelectItem>
                        ))}
                      {startupType === "group" &&
                        groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {startupType !== "none" && startupId && (
                <div className="rounded-md bg-accent p-3 text-sm">
                  <p className="font-medium">Current startup:</p>
                  <p className="text-muted-foreground">
                    {startupType === "space" ? "Space" : "Group"}: {selectedName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {startupConfig && (
            <Button
              variant="outline"
              onClick={handleLaunchStartup}
              disabled={isLoading}
            >
              Launch Now
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
