import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Space, StartupConfig } from "@/types";

interface SettingsDialogProps {
  open: boolean;
  spaces: Space[];
  startupConfig: StartupConfig | null;
  onClose: () => void;
  onSave: (config: StartupConfig | null) => void;
}

const NO_STARTUP = "__none__";

export function SettingsDialog({
  open,
  spaces,
  startupConfig,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(NO_STARTUP);

  useEffect(() => {
    if (open) {
      setSelectedId(
        startupConfig?.type === "space" ? startupConfig.id : NO_STARTUP,
      );
    }
  }, [open, startupConfig]);

  function handleSave() {
    if (selectedId === NO_STARTUP) {
      onSave(null);
    } else {
      onSave({ type: "space", id: selectedId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure application settings and startup behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startup-space">Startup Space</Label>
            <p className="text-xs text-muted-foreground">
              Select a space to launch automatically when the app starts.
            </p>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="startup-space">
                <SelectValue placeholder="None (no startup)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STARTUP}>None</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
