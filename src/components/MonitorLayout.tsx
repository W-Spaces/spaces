import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor as MonitorIcon } from "lucide-react";
import type {
  MonitorInfo,
  SpaceItem,
  SpaceItemType,
  WindowPlacement,
} from "@/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_H = 220; // px total height of the monitor canvas
const MONITOR_PADDING = 20; // px inset from canvas edges

/** Default size of a freshly-placed window chip (fractions of monitor) */
const DEFAULT_W = 0.42;
const DEFAULT_H = 0.38;

// ── Colors per item type ──────────────────────────────────────────────────────

const CHIP_BG: Record<SpaceItemType, string> = {
  application: "bg-blue-500/80  border-blue-400/60",
  terminal: "bg-green-500/80 border-green-400/60",
  url: "bg-purple-500/80 border-purple-400/60",
  script: "bg-orange-500/80 border-orange-400/60",
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

interface Geo {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function computeGeo(monitors: MonitorInfo[], containerWidth: number): Geo {
  if (monitors.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

  const minX = Math.min(...monitors.map((m) => m.x));
  const minY = Math.min(...monitors.map((m) => m.y));
  const maxX = Math.max(...monitors.map((m) => m.x + m.width));
  const maxY = Math.max(...monitors.map((m) => m.y + m.height));

  const virtualW = maxX - minX;
  const virtualH = maxY - minY;

  const usableW = containerWidth - MONITOR_PADDING * 2;
  const usableH = CANVAS_H - MONITOR_PADDING * 2 - 20; // 20px for labels

  const scale = Math.min(usableW / virtualW, usableH / virtualH);

  const scaledW = virtualW * scale;
  const scaledH = virtualH * scale;

  const offsetX = (containerWidth - scaledW) / 2 - minX * scale;
  const offsetY = MONITOR_PADDING - minY * scale + (usableH - scaledH) / 2;

  return { scale, offsetX, offsetY };
}

interface MonitorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function getMonitorRect(m: MonitorInfo, geo: Geo): MonitorRect {
  return {
    left: m.x * geo.scale + geo.offsetX,
    top: m.y * geo.scale + geo.offsetY,
    width: m.width * geo.scale,
    height: m.height * geo.scale,
  };
}

function monitorAtPoint(
  cx: number,
  cy: number,
  monitors: MonitorInfo[],
  geo: Geo,
): MonitorInfo | null {
  for (const m of monitors) {
    const r = getMonitorRect(m, geo);
    if (
      cx >= r.left &&
      cx < r.left + r.width &&
      cy >= r.top &&
      cy < r.top + r.height
    ) {
      return m;
    }
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DragState {
  itemId: string;
  fallbackMonitorIndex: number;
}

interface MonitorLayoutProps {
  monitors: MonitorInfo[];
  items: SpaceItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onPlacementChange: (
    itemId: string,
    placement: WindowPlacement | undefined,
  ) => void;
}

export function MonitorLayout({
  monitors,
  items,
  selectedItemId,
  onSelectItem,
  onPlacementChange,
}: MonitorLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Local placement state – kept in sync with props.items, modified live during drag
  const [localPlacements, setLocalPlacements] = useState<
    Record<string, WindowPlacement>
  >({});

  useEffect(() => {
    const map: Record<string, WindowPlacement> = {};
    for (const item of items) {
      if (item.placement) map[item.id] = item.placement;
    }
    setLocalPlacements(map);
  }, [items]);

  // Container resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const geo = computeGeo(monitors, containerWidth);

  // ── Drag on canvas ─────────────────────────────────────────────────────────

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !containerRef.current) return;

      const canvasRect = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - canvasRect.left;
      const cy = e.clientY - canvasRect.top;

      const target =
        monitorAtPoint(cx, cy, monitors, geo) ??
        monitors[drag.fallbackMonitorIndex] ??
        monitors[0];

      if (!target) return;

      const mr = getMonitorRect(target, geo);
      const pl = localPlacements[drag.itemId];
      const chipFracW = pl?.w ?? DEFAULT_W;
      const chipFracH = pl?.h ?? DEFAULT_H;

      // Centre chip on cursor
      let fracX = (cx - mr.left) / mr.width - chipFracW / 2;
      let fracY = (cy - mr.top) / mr.height - chipFracH / 2;
      fracX = Math.max(0, Math.min(1 - chipFracW, fracX));
      fracY = Math.max(0, Math.min(1 - chipFracH, fracY));

      setLocalPlacements((prev) => ({
        ...prev,
        [drag.itemId]: {
          monitorIndex: target.index,
          x: fracX,
          y: fracY,
          w: chipFracW,
          h: chipFracH,
        },
      }));
    },
    [drag, monitors, geo, localPlacements],
  );

  const handleCanvasPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (!drag) return;
      const placement = localPlacements[drag.itemId];
      if (placement) onPlacementChange(drag.itemId, placement);
      setDrag(null);
    },
    [drag, localPlacements, onPlacementChange],
  );

  function startChipDrag(e: React.PointerEvent, item: SpaceItem) {
    e.stopPropagation();
    e.preventDefault();
    // Capture pointer on the canvas so we keep getting events globally
    containerRef.current?.setPointerCapture(e.pointerId);
    setDrag({
      itemId: item.id,
      fallbackMonitorIndex: localPlacements[item.id]?.monitorIndex ?? 0,
    });
    onSelectItem(item.id);
  }

  // ── Place item by clicking on a monitor ───────────────────────────────────

  function handleMonitorClick(e: React.MouseEvent, monitor: MonitorInfo) {
    // If an unassigned item is selected, place it at the clicked position
    if (!selectedItemId) return;
    if (localPlacements[selectedItemId] !== undefined) return; // already placed, let drag handle it

    const canvasRect = containerRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const cx = e.clientX - canvasRect.left;
    const cy = e.clientY - canvasRect.top;
    const mr = getMonitorRect(monitor, geo);

    let fracX = (cx - mr.left) / mr.width - DEFAULT_W / 2;
    let fracY = (cy - mr.top) / mr.height - DEFAULT_H / 2;
    fracX = Math.max(0, Math.min(1 - DEFAULT_W, fracX));
    fracY = Math.max(0, Math.min(1 - DEFAULT_H, fracY));

    const placement: WindowPlacement = {
      monitorIndex: monitor.index,
      x: fracX,
      y: fracY,
      w: DEFAULT_W,
      h: DEFAULT_H,
    };
    setLocalPlacements((prev) => ({ ...prev, [selectedItemId]: placement }));
    onPlacementChange(selectedItemId, placement);
  }

  function removeChipPlacement(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    setLocalPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    onPlacementChange(itemId, undefined);
    if (selectedItemId === itemId) onSelectItem(null);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const assignedIds = new Set(Object.keys(localPlacements));
  const unassignedItems = items.filter((item) => !assignedIds.has(item.id));
  const isPendingAssign = selectedItemId && !assignedIds.has(selectedItemId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-border bg-[#080810]"
        style={{ height: CANVAS_H, cursor: drag ? "grabbing" : "default" }}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      >
        {monitors.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <MonitorIcon className="h-10 w-10" />
          </div>
        ) : (
          monitors.map((monitor) => {
            const mr = getMonitorRect(monitor, geo);
            const monitorItems = items.filter(
              (it) => localPlacements[it.id]?.monitorIndex === monitor.index,
            );
            const isDropTarget = !!isPendingAssign;

            return (
              <div
                key={monitor.index}
                className={cn(
                  "absolute overflow-hidden rounded border-2 transition-colors",
                  isDropTarget
                    ? "border-primary/60 cursor-crosshair"
                    : "border-[#1e1e2e]",
                )}
                style={{
                  left: mr.left,
                  top: mr.top,
                  width: mr.width,
                  height: mr.height,
                  background:
                    "radial-gradient(ellipse at 50% 0%, #0d0d1f 0%, #060608 100%)",
                }}
                onClick={(e) => handleMonitorClick(e, monitor)}
              >
                {/* Subtle dot-grid */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.035]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: `${Math.max(8, mr.width / 12)}px ${Math.max(8, mr.height / 8)}px`,
                  }}
                />

                {/* Monitor index label */}
                <span className="pointer-events-none absolute left-1.5 top-1 select-none text-[9px] font-medium text-white/20">
                  {monitor.index + 1}
                </span>

                {/* Window placeholder chips */}
                {monitorItems.map((item) => {
                  const pl = localPlacements[item.id]!;
                  const isSelected = item.id === selectedItemId;
                  const isDragging = drag?.itemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute overflow-hidden rounded border text-white",
                        "flex flex-col justify-between p-1 select-none",
                        CHIP_BG[item.type],
                        isSelected &&
                          "ring-2 ring-white/70 ring-offset-1 ring-offset-black/50",
                        isDragging
                          ? "cursor-grabbing opacity-95 shadow-2xl"
                          : "cursor-grab transition-[left,top] duration-75",
                      )}
                      style={{
                        left: `${pl.x * 100}%`,
                        top: `${pl.y * 100}%`,
                        width: `${pl.w * 100}%`,
                        height: `${pl.h * 100}%`,
                      }}
                      onPointerDown={(e) => startChipDrag(e, item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item.id);
                      }}
                    >
                      {/* Title bar strip */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="truncate text-[8px] font-semibold leading-tight opacity-90"
                          style={{ fontSize: Math.max(7, mr.width * 0.028) }}
                        >
                          {item.name}
                        </span>
                        <button
                          className="shrink-0 rounded-sm opacity-50 hover:opacity-100 leading-none"
                          style={{ fontSize: Math.max(8, mr.width * 0.032) }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => removeChipPlacement(e, item.id)}
                          aria-label="Remove placement"
                        >
                          ×
                        </button>
                      </div>

                      {/* Content area (decorative window lines) */}
                      <div className="flex-1 mt-0.5 space-y-0.5 opacity-20">
                        <div className="h-px w-4/5 rounded bg-white/60" />
                        <div className="h-px w-3/5 rounded bg-white/60" />
                        <div className="h-px w-2/3 rounded bg-white/60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}

        {/* Monitor name labels – positioned inside canvas below each monitor */}
        {monitors.map((monitor) => {
          const mr = getMonitorRect(monitor, geo);
          return (
            <div
              key={`label-${monitor.index}`}
              className="pointer-events-none absolute text-center"
              style={{
                left: mr.left,
                top: mr.top + mr.height + 4,
                width: mr.width,
              }}
            >
              <span className="text-[10px] text-muted-foreground/60">
                {monitor.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Unassigned items tray */}
      {unassignedItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {isPendingAssign
              ? "Click on a monitor to place the selected window"
              : "Select a window below, then click a monitor to assign it"}
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedItems.map((item) => {
              const isActive = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(isActive ? null : item.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-white transition-all",
                    CHIP_BG[item.type],
                    isActive
                      ? "ring-2 ring-white/60 ring-offset-1 ring-offset-background"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
