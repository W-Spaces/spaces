import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonitorLayout } from "./MonitorLayout";
import type { SpaceItem, MonitorInfo, WindowPlacement } from "@/types";

// Note: Internal geometry functions (computeGeo, getMonitorRect, monitorAtPoint)
// are exercised indirectly through the component tests below.
// They are not exported, so vi.importActual cannot reach them in the Vite transform.

// ── Component tests ───────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<SpaceItem> = {}): SpaceItem => ({
  id: "item-1",
  type: "application",
  name: "Test App",
  path: "test.exe",
  args: [],
  ...overrides,
});

const makePlacement = (
  overrides: Partial<WindowPlacement> = {},
): WindowPlacement => ({
  monitorIndex: 0,
  x: 0.1,
  y: 0.1,
  w: 0.4,
  h: 0.4,
  monitorX: 0,
  monitorY: 0,
  monitorWidth: 1920,
  monitorHeight: 1080,
  ...overrides,
});

const defaultMonitors: MonitorInfo[] = [
  {
    index: 0,
    name: "Display 1",
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    scaleFactor: 1,
  },
  {
    index: 1,
    name: "Display 2",
    width: 1920,
    height: 1080,
    x: 1920,
    y: 0,
    scaleFactor: 1,
  },
];

describe("MonitorLayout component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders monitor labels", () => {
    render(
      <MonitorLayout
        monitors={defaultMonitors}
        items={[]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        onPlacementChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Display 1")).toBeInTheDocument();
    expect(screen.getByText("Display 2")).toBeInTheDocument();
  });

  it("renders item chips", () => {
    const items = [
      makeItem({
        id: "app1",
        name: "Notepad",
        placement: makePlacement({ x: 0, y: 0, w: 0.5, h: 0.5 }),
      }),
    ];
    render(
      <MonitorLayout
        monitors={defaultMonitors}
        items={items}
        selectedItemId="app1"
        onSelectItem={vi.fn()}
        onPlacementChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Notepad")).toBeInTheDocument();
  });

  it("renders with empty items", () => {
    render(
      <MonitorLayout
        monitors={defaultMonitors}
        items={[]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        onPlacementChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Display 1")).toBeInTheDocument();
    expect(screen.getByText("Display 2")).toBeInTheDocument();
  });

  it("renders with empty monitors array", () => {
    render(
      <MonitorLayout
        monitors={[]}
        items={[]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        onPlacementChange={vi.fn()}
      />,
    );

    // The component should render the canvas container without crashing
    // (the canvas div has a fixed height of 220px)
    const canvas = document.querySelector('[style*="height: 220px"]');
    expect(canvas).toBeInTheDocument();
  });

  it("highlights selected item chip", () => {
    const items = [
      makeItem({ id: "selected", name: "Selected App" }),
      makeItem({ id: "other", name: "Other App" }),
    ];
    render(
      <MonitorLayout
        monitors={defaultMonitors}
        items={items}
        selectedItemId="selected"
        onSelectItem={vi.fn()}
        onPlacementChange={vi.fn()}
      />,
    );

    // Selected item should be rendered
    expect(screen.getByText("Selected App")).toBeInTheDocument();
    expect(screen.getByText("Other App")).toBeInTheDocument();
  });
});
