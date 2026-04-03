import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor as MonitorIcon, X } from "lucide-react";
import type {
  MonitorInfo,
  SpaceItem,
  SpaceItemType,
  WindowPlacement,
} from "@/types";
import { useMonitors } from "@/hooks/useMonitors";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAD = 48;
const DEFAULT_W = 0.45;
const DEFAULT_H = 0.4;
const SNAP_EDGE_PX = 48;
const SNAP_CORNER_PX = 80;

// ── Types ─────────────────────────────────────────────────────────────────────

type SnapZoneId =
  | "full"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "tl"
  | "tr"
  | "bl"
  | "br";

interface SnapZone {
  id: SnapZoneId;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SNAP_ZONES: Record<SnapZoneId, SnapZone> = {
  full: { id: "full", x: 0, y: 0, w: 1, h: 1 },
  left: { id: "left", x: 0, y: 0, w: 0.5, h: 1 },
  right: { id: "right", x: 0.5, y: 0, w: 0.5, h: 1 },
  top: { id: "top", x: 0, y: 0, w: 1, h: 0.5 },
  bottom: { id: "bottom", x: 0, y: 0.5, w: 1, h: 0.5 },
  tl: { id: "tl", x: 0, y: 0, w: 0.5, h: 0.5 },
  tr: { id: "tr", x: 0.5, y: 0, w: 0.5, h: 0.5 },
  bl: { id: "bl", x: 0, y: 0.5, w: 0.5, h: 0.5 },
  br: { id: "br", x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
};

const SNAP_LABELS: Record<SnapZoneId, string> = {
  full: "Fullscreen",
  left: "Left half",
  right: "Right half",
  top: "Top half",
  bottom: "Bottom half",
  tl: "Top-left",
  tr: "Top-right",
  bl: "Bottom-left",
  br: "Bottom-right",
};

// ── Colors ────────────────────────────────────────────────────────────────────

const CHIP_ACTIVE: Record<
  SpaceItemType,
  { bg: string; border: string; text: string; shadow: string }
> = {
  application: {
    bg: "#1D4ED8",
    border: "#3B82F6",
    text: "#fff",
    shadow: "rgba(59,130,246,.35)",
  },
  terminal: {
    bg: "#065F46",
    border: "#10B981",
    text: "#fff",
    shadow: "rgba(16,185,129,.35)",
  },
  url: {
    bg: "#5B21B6",
    border: "#8B5CF6",
    text: "#fff",
    shadow: "rgba(139,92,246,.35)",
  },
  script: {
    bg: "#92400E",
    border: "#F59E0B",
    text: "#fff",
    shadow: "rgba(245,158,11,.35)",
  },
};

const CHIP_INACTIVE: Record<
  SpaceItemType,
  { bg: string; border: string; text: string; shadow: string }
> = {
  application: {
    bg: "rgba(37,99,235,.15)",
    border: "rgba(59,130,246,.3)",
    text: "rgba(255,255,255,.5)",
    shadow: "transparent",
  },
  terminal: {
    bg: "rgba(5,150,105,.15)",
    border: "rgba(16,185,129,.3)",
    text: "rgba(255,255,255,.5)",
    shadow: "transparent",
  },
  url: {
    bg: "rgba(124,58,237,.15)",
    border: "rgba(139,92,246,.3)",
    text: "rgba(255,255,255,.5)",
    shadow: "transparent",
  },
  script: {
    bg: "rgba(217,119,6,.15)",
    border: "rgba(245,158,11,.3)",
    text: "rgba(255,255,255,.5)",
    shadow: "transparent",
  },
};

// ── Geometry ──────────────────────────────────────────────────────────────────

interface Geo {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function computeGeo(
  monitors: MonitorInfo[],
  canvasW: number,
  canvasH: number,
): Geo {
  if (!monitors.length) return { scale: 1, offsetX: 0, offsetY: 0 };
  const minX = Math.min(...monitors.map((m) => m.x));
  const minY = Math.min(...monitors.map((m) => m.y));
  const maxX = Math.max(...monitors.map((m) => m.x + m.width));
  const maxY = Math.max(...monitors.map((m) => m.y + m.height));
  const vW = maxX - minX;
  const vH = maxY - minY;
  const scale = Math.min((canvasW - PAD * 2) / vW, (canvasH - PAD * 2) / vH);
  const scaledW = vW * scale;
  const scaledH = vH * scale;
  return {
    scale,
    offsetX: (canvasW - scaledW) / 2 - minX * scale,
    offsetY: (canvasH - scaledH) / 2 - minY * scale,
  };
}

interface MonitorRect {
  left: number;
  top: number;
  width: number;
  height: number;
  monitor: MonitorInfo;
}

function getMR(m: MonitorInfo, geo: Geo): MonitorRect {
  return {
    left: m.x * geo.scale + geo.offsetX,
    top: m.y * geo.scale + geo.offsetY,
    width: m.width * geo.scale,
    height: m.height * geo.scale,
    monitor: m,
  };
}

function findMRAt(
  cx: number,
  cy: number,
  rects: MonitorRect[],
): MonitorRect | null {
  return (
    rects.find(
      (r) =>
        cx >= r.left &&
        cx < r.left + r.width &&
        cy >= r.top &&
        cy < r.top + r.height,
    ) ?? null
  );
}

function getSnapZone(cx: number, cy: number, mr: MonitorRect): SnapZone | null {
  const rx = cx - mr.left;
  const ry = cy - mr.top;
  const W = mr.width;
  const H = mr.height;
  const nL = rx < SNAP_EDGE_PX;
  const nR = rx > W - SNAP_EDGE_PX;
  const nT = ry < SNAP_EDGE_PX;
  const nB = ry > H - SNAP_EDGE_PX;
  const cL = rx < SNAP_CORNER_PX;
  const cR = rx > W - SNAP_CORNER_PX;

  if (nT && ry < 8) return SNAP_ZONES.full;
  if (nT && cL) return SNAP_ZONES.tl;
  if (nT && cR) return SNAP_ZONES.tr;
  if (nB && cL) return SNAP_ZONES.bl;
  if (nB && cR) return SNAP_ZONES.br;
  if (nL) return SNAP_ZONES.left;
  if (nR) return SNAP_ZONES.right;
  if (nT) return SNAP_ZONES.top;
  if (nB) return SNAP_ZONES.bottom;
  return null;
}

// ── Drag / Resize state ───────────────────────────────────────────────────────

interface DragState {
  itemId: string;
  /** Cursor offset from chip top-left, in canvas px. Keeps cursor fixed inside chip. */
  offsetCX: number;
  offsetCY: number;
  fracW: number;
  fracH: number;
}

type ResizeHandle = "nw" | "ne" | "se" | "sw";

interface ResizeState {
  itemId: string;
  handle: ResizeHandle;
  startCX: number;
  startCY: number;
  startPlacement: WindowPlacement;
  mr: MonitorRect;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WindowPlacementDialogProps {
  open: boolean;
  items: SpaceItem[];
  activeItemId: string | null;
  onClose: () => void;
  onSelectItem: (id: string | null) => void;
  onPlacementChange: (
    itemId: string,
    placement: WindowPlacement | undefined,
  ) => void;
}

export function WindowPlacementDialog({
  open,
  items,
  activeItemId,
  onClose,
  onSelectItem,
  onPlacementChange,
}: WindowPlacementDialogProps) {
  const monitors = useMonitors();

  /** Enrich a partial placement with the monitor's absolute pixel coords. */
  function withMonitor(
    pl: Omit<
      WindowPlacement,
      "monitorX" | "monitorY" | "monitorWidth" | "monitorHeight"
    >,
  ): WindowPlacement {
    const mon =
      monitors.find((m) => m.index === pl.monitorIndex) ?? monitors[0];
    return {
      ...pl,
      monitorX: mon?.x ?? 0,
      monitorY: mon?.y ?? 0,
      monitorWidth: mon?.width ?? 1920,
      monitorHeight: mon?.height ?? 1080,
    };
  }
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 680 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [snapZone, setSnapZone] = useState<{
    monitorIndex: number;
    zone: SnapZone;
  } | null>(null);
  const [localPlacements, setLocalPlacements] = useState<
    Record<string, WindowPlacement>
  >({});

  // Sync placements whenever dialog opens or items change
  useEffect(() => {
    const map: Record<string, WindowPlacement> = {};
    items.forEach((it) => {
      if (it.placement) map[it.id] = it.placement;
    });
    setLocalPlacements(map);
  }, [items, open]);

  // Track canvas size via ResizeObserver
  useEffect(() => {
    if (!open) return;
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    ro.observe(el);
    setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [open]);

  const geo = computeGeo(monitors, canvasSize.w, canvasSize.h);
  const monitorRects = monitors.map((m) => getMR(m, geo));

  // ── Pointer move ─────────────────────────────────────────────────────────────

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (drag) {
        const cursorMr = findMRAt(cx, cy, monitorRects) ?? monitorRects[0];
        if (!cursorMr) return;

        // Chip top-left: cursor position minus fixed offset inside chip
        const chipLeft = cx - drag.offsetCX;
        const chipTop = cy - drag.offsetCY;

        // Chip center for monitor assignment
        const chipPxW = drag.fracW * cursorMr.width;
        const chipPxH = drag.fracH * cursorMr.height;
        const targetMr =
          findMRAt(
            chipLeft + chipPxW / 2,
            chipTop + chipPxH / 2,
            monitorRects,
          ) ?? cursorMr;

        let fracX = (chipLeft - targetMr.left) / targetMr.width;
        let fracY = (chipTop - targetMr.top) / targetMr.height;
        fracX = Math.max(0, Math.min(1 - drag.fracW, fracX));
        fracY = Math.max(0, Math.min(1 - drag.fracH, fracY));

        const sz = findMRAt(cx, cy, monitorRects)
          ? getSnapZone(cx, cy, targetMr)
          : null;
        setSnapZone(
          sz ? { monitorIndex: targetMr.monitor.index, zone: sz } : null,
        );

        setLocalPlacements((prev) => ({
          ...prev,
          [drag.itemId]: withMonitor({
            monitorIndex: targetMr.monitor.index,
            x: fracX,
            y: fracY,
            w: drag.fracW,
            h: drag.fracH,
          }),
        }));
      }

      if (resize) {
        const { handle, startCX, startCY, startPlacement: sp, mr } = resize;
        const dx = (cx - startCX) / mr.width;
        const dy = (cy - startCY) / mr.height;
        const MIN = 0.08;
        let { x, y, w, h } = sp;

        if (handle === "se") {
          w = Math.max(MIN, sp.w + dx);
          h = Math.max(MIN, sp.h + dy);
        } else if (handle === "sw") {
          const nx = Math.min(sp.x + sp.w - MIN, sp.x + dx);
          w = sp.w - (nx - sp.x);
          x = nx;
          h = Math.max(MIN, sp.h + dy);
        } else if (handle === "ne") {
          w = Math.max(MIN, sp.w + dx);
          const ny = Math.min(sp.y + sp.h - MIN, sp.y + dy);
          h = sp.h - (ny - sp.y);
          y = ny;
        } else if (handle === "nw") {
          const nx = Math.min(sp.x + sp.w - MIN, sp.x + dx);
          w = sp.w - (nx - sp.x);
          x = nx;
          const ny = Math.min(sp.y + sp.h - MIN, sp.y + dy);
          h = sp.h - (ny - sp.y);
          y = ny;
        }

        x = Math.max(0, x);
        y = Math.max(0, y);
        w = Math.min(w, 1 - x);
        h = Math.min(h, 1 - y);
        setLocalPlacements((prev) => ({
          ...prev,
          [resize.itemId]: withMonitor({
            monitorIndex: sp.monitorIndex,
            x,
            y,
            w,
            h,
          }),
        }));
      }
    },
    [drag, resize, monitorRects],
  );

  // ── Pointer up ───────────────────────────────────────────────────────────────

  const handlePointerUp = useCallback(() => {
    if (drag) {
      const pl = localPlacements[drag.itemId];
      if (pl) {
        if (snapZone && snapZone.monitorIndex === pl.monitorIndex) {
          const snapped = withMonitor({
            monitorIndex: pl.monitorIndex,
            x: snapZone.zone.x,
            y: snapZone.zone.y,
            w: snapZone.zone.w,
            h: snapZone.zone.h,
          });
          setLocalPlacements((prev) => ({ ...prev, [drag.itemId]: snapped }));
          onPlacementChange(drag.itemId, snapped);
        } else {
          onPlacementChange(drag.itemId, withMonitor(pl));
        }
      }
      setDrag(null);
      setSnapZone(null);
    }
    if (resize) {
      const pl = localPlacements[resize.itemId];
      if (pl) onPlacementChange(resize.itemId, withMonitor(pl));
      setResize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, resize, localPlacements, snapZone, onPlacementChange, monitors]);

  // ── Start drag ───────────────────────────────────────────────────────────────

  function startDrag(e: React.PointerEvent, item: SpaceItem) {
    e.stopPropagation();
    canvasRef.current?.setPointerCapture(e.pointerId);

    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const pl = localPlacements[item.id];
    const fracW = pl?.w ?? DEFAULT_W;
    const fracH = pl?.h ?? DEFAULT_H;

    let chipLeft: number;
    let chipTop: number;

    if (pl) {
      const mr =
        monitorRects.find((r) => r.monitor.index === pl.monitorIndex) ??
        monitorRects[0];
      chipLeft = mr.left + pl.x * mr.width;
      chipTop = mr.top + pl.y * mr.height;
    } else {
      const mr = findMRAt(cx, cy, monitorRects) ?? monitorRects[0];
      // Clamp so chip stays within monitor bounds before computing fractions
      const rawLeft = cx - (fracW * mr.width) / 2;
      const rawTop = cy - (fracH * mr.height) / 2;
      chipLeft = Math.max(
        mr.left,
        Math.min(mr.left + mr.width * (1 - fracW), rawLeft),
      );
      chipTop = Math.max(
        mr.top,
        Math.min(mr.top + mr.height * (1 - fracH), rawTop),
      );
      const fx = (chipLeft - mr.left) / mr.width;
      const fy = (chipTop - mr.top) / mr.height;
      setLocalPlacements((prev) => ({
        ...prev,
        [item.id]: withMonitor({
          monitorIndex: mr.monitor.index,
          x: fx,
          y: fy,
          w: fracW,
          h: fracH,
        }),
      }));
    }

    setDrag({
      itemId: item.id,
      offsetCX: cx - chipLeft,
      offsetCY: cy - chipTop,
      fracW,
      fracH,
    });
    onSelectItem(item.id);
  }

  // ── Start resize ─────────────────────────────────────────────────────────────

  function startResize(
    e: React.PointerEvent,
    item: SpaceItem,
    handle: ResizeHandle,
  ) {
    e.stopPropagation();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pl = localPlacements[item.id];
    if (!pl) return;
    const mr =
      monitorRects.find((r) => r.monitor.index === pl.monitorIndex) ??
      monitorRects[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    setResize({
      itemId: item.id,
      handle,
      startCX: e.clientX - rect.left,
      startCY: e.clientY - rect.top,
      startPlacement: { ...pl },
      mr,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!open) return null;

  const assignedIds = new Set(Object.keys(localPlacements));
  const unassigned = items.filter((it) => !assignedIds.has(it.id));
  const busy = !!drag || !!resize;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: "90vw",
          height: "85vh",
          background: "hsl(224 40% 5%)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,.8)",
        }}
      >
        {/* ── Header (fixed) ─────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between px-6"
          style={{
            height: 56,
            borderBottom: "1px solid rgba(255,255,255,.07)",
            background: "rgba(255,255,255,.02)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "rgba(59,130,246,.2)",
                border: "1px solid rgba(59,130,246,.3)",
              }}
            >
              <MonitorIcon className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">
                Place Windows
              </h2>
              <p className="text-[11px] text-white/35">
                Drag onto monitors · edges to snap · corners to resize
              </p>
            </div>
          </div>

          {snapZone && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-300"
              style={{
                background: "rgba(59,130,246,.18)",
                border: "1px solid rgba(59,130,246,.4)",
              }}
            >
              ⬡ {SNAP_LABELS[snapZone.zone.id]}
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          className="relative overflow-y-auto"
          style={{
            flex: 1,
            cursor: busy ? "crosshair" : "default",
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {monitors.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-white/20">No monitors detected</p>
            </div>
          ) : (
            <>
              {/* Monitor backgrounds */}
              {monitorRects.map((mr) => {
                const sz =
                  snapZone?.monitorIndex === mr.monitor.index
                    ? snapZone.zone
                    : null;
                const titleH = Math.max(10, mr.height * 0.055);
                const dotR = Math.max(3, mr.height * 0.022);

                return (
                  <div
                    key={mr.monitor.index}
                    className="absolute overflow-hidden"
                    style={{
                      left: mr.left,
                      top: mr.top,
                      width: mr.width,
                      height: mr.height,
                      borderRadius: 10,
                      background:
                        "linear-gradient(155deg, hsl(224 40% 12%) 0%, hsl(224 40% 9%) 100%)",
                      border: "1.5px solid rgba(255,255,255,.1)",
                      boxShadow:
                        "0 8px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)",
                    }}
                  >
                    {/* Dot-grid texture */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                      }}
                    />

                    {/* macOS-style title bar */}
                    <div
                      className="absolute left-0 right-0 top-0 flex items-center gap-1.5 px-2.5"
                      style={{
                        height: titleH,
                        background: "rgba(255,255,255,.04)",
                        borderBottom: "1px solid rgba(255,255,255,.05)",
                      }}
                    >
                      {(["#EF4444", "#F59E0B", "#22C55E"] as const).map((c) => (
                        <div
                          key={c}
                          style={{
                            width: dotR * 2,
                            height: dotR * 2,
                            borderRadius: "50%",
                            background: c,
                            opacity: 0.65,
                          }}
                        />
                      ))}
                    </div>

                    {/* Bottom label */}
                    <div
                      className="absolute bottom-1.5 left-2 font-medium"
                      style={{
                        fontSize: Math.max(8, mr.height * 0.038),
                        color: "rgba(255,255,255,.18)",
                      }}
                    >
                      {mr.monitor.name} · {mr.monitor.width}×{mr.monitor.height}
                    </div>

                    {/* Monitor index */}
                    <div
                      className="absolute right-2 flex items-center justify-center rounded-full font-bold"
                      style={{
                        top: titleH + 4,
                        width: Math.max(14, mr.height * 0.065),
                        height: Math.max(14, mr.height * 0.065),
                        fontSize: Math.max(8, mr.height * 0.036),
                        background: "rgba(255,255,255,.07)",
                        color: "rgba(255,255,255,.3)",
                      }}
                    >
                      {mr.monitor.index + 1}
                    </div>

                    {/* Snap zone overlay */}
                    {sz && (
                      <div
                        className="pointer-events-none absolute"
                        style={{
                          left: `${sz.x * 100}%`,
                          top: `${sz.y * 100}%`,
                          width: `${sz.w * 100}%`,
                          height: `${sz.h * 100}%`,
                          background: "rgba(59,130,246,.2)",
                          border: "2px solid rgba(59,130,246,.7)",
                          borderRadius: 7,
                          transition: "all .1s ease",
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Placed chips */}
              {items.map((item) => {
                const pl = localPlacements[item.id];
                if (!pl) return null;
                const mr = monitorRects.find(
                  (r) => r.monitor.index === pl.monitorIndex,
                );
                if (!mr) return null;

                const isActive = item.id === activeItemId;
                const isDragging = drag?.itemId === item.id;
                const c = isActive
                  ? CHIP_ACTIVE[item.type]
                  : CHIP_INACTIVE[item.type];

                const chipLeft = mr.left + pl.x * mr.width;
                const chipTop = mr.top + pl.y * mr.height;
                const chipW = Math.max(pl.w * mr.width, 56);
                const chipH = Math.max(pl.h * mr.height, 32);

                return (
                  <div
                    key={item.id}
                    className="absolute select-none"
                    style={{
                      left: chipLeft,
                      top: chipTop,
                      width: chipW,
                      height: chipH,
                      background: c.bg,
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 7,
                      boxShadow: isDragging
                        ? `0 20px 56px rgba(0,0,0,.8), 0 0 0 2px ${c.border}`
                        : isActive
                          ? `0 4px 20px ${c.shadow}, 0 0 0 1px ${c.border}`
                          : "0 2px 8px rgba(0,0,0,.3)",
                      cursor: isDragging ? "grabbing" : "grab",
                      zIndex: isDragging ? 30 : isActive ? 15 : 10,
                      transition:
                        isDragging || resize?.itemId === item.id
                          ? "none"
                          : "box-shadow .15s",
                    }}
                    onPointerDown={(e) => startDrag(e, item)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(isActive ? null : item.id);
                    }}
                  >
                    <div className="flex h-full items-center justify-center px-2">
                      <span
                        className="truncate font-medium"
                        style={{
                          fontSize: Math.max(10, Math.min(13, chipH * 0.28)),
                          color: c.text,
                        }}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Corner resize handles (active chip only) */}
                    {isActive &&
                      (["nw", "ne", "se", "sw"] as ResizeHandle[]).map((h) => (
                        <div
                          key={h}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startResize(e, item, h);
                          }}
                          style={{
                            position: "absolute",
                            width: 9,
                            height: 9,
                            background: "#fff",
                            border: `2px solid ${c.border}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 4px rgba(0,0,0,.5)",
                            zIndex: 40,
                            ...(h.includes("n") ? { top: -5 } : { bottom: -5 }),
                            ...(h.includes("w") ? { left: -5 } : { right: -5 }),
                            cursor:
                              h === "nw" || h === "se"
                                ? "nwse-resize"
                                : "nesw-resize",
                          }}
                        />
                      ))}
                  </div>
                );
              })}

              {/* Unplaced tray */}
              {unassigned.length > 0 && (
                <div
                  className="absolute bottom-5 left-1/2"
                  style={{
                    transform: "translateX(-50%)",
                    background: "rgba(13,17,27,.92)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 14,
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 8px 32px rgba(0,0,0,.6)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,.25)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginRight: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Unplaced
                  </span>
                  {unassigned.map((item) => {
                    const isActive = item.id === activeItemId;
                    const c = isActive
                      ? CHIP_ACTIVE[item.type]
                      : CHIP_INACTIVE[item.type];
                    return (
                      <div
                        key={item.id}
                        onPointerDown={(e) => startDrag(e, item)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(isActive ? null : item.id);
                        }}
                        style={{
                          background: c.bg,
                          border: `1.5px solid ${c.border}`,
                          borderRadius: 7,
                          padding: "6px 14px",
                          cursor: "grab",
                          fontSize: 12,
                          fontWeight: 500,
                          color: c.text,
                          whiteSpace: "nowrap",
                          userSelect: "none",
                          boxShadow: isActive
                            ? `0 0 0 2px ${c.border}`
                            : "none",
                          transition: "box-shadow .15s",
                        }}
                      >
                        {item.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
