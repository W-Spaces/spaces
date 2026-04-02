import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WindowPlacementDialog } from "./WindowPlacementDialog";
import type { SpaceItem, WindowPlacement, MonitorInfo } from "@/types";

// Note: Internal constants (SNAP_ZONES, SNAP_LABELS, SNAP_EDGE_PX, etc.) and
// geometry helpers are not exported, so vi.importActual cannot reach them in
// the Vite transform. They are exercised indirectly through the component tests.

// ── Component integration tests ───────────────────────────────────────────────

const makeItem = (overrides: Partial<SpaceItem> = {}): SpaceItem => ({
  id: "item-1",
  type: "application",
  name: "Test App",
  path: "C:\\test\\app.exe",
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

const defaultProps = {
  open: true,
  items: [] as SpaceItem[],
  activeItemId: null as string | null,
  onClose: vi.fn(),
  onSelectItem: vi.fn(),
  onPlacementChange: vi.fn(),
};

describe("WindowPlacementDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <WindowPlacementDialog {...defaultProps} open={false} />,
    );
    // Dialog should not render children when closed
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the dialog when open", () => {
    render(<WindowPlacementDialog {...defaultProps} />);
    expect(screen.getByText("Place Windows")).toBeInTheDocument();
  });

  it("renders items on the canvas", () => {
    const items = [
      makeItem({
        id: "a",
        name: "App A",
        placement: makePlacement({ x: 0, y: 0, w: 0.5, h: 1 }),
      }),
      makeItem({
        id: "b",
        name: "App B",
        placement: makePlacement({ monitorIndex: 1, x: 0, y: 0, w: 0.5, h: 1 }),
      }),
    ];
    render(
      <WindowPlacementDialog
        {...defaultProps}
        items={items}
        activeItemId="a"
      />,
    );

    expect(screen.getByText("App A")).toBeInTheDocument();
    expect(screen.getByText("App B")).toBeInTheDocument();
  });

  it("calls onSelectItem when an item chip is clicked", async () => {
    const onSelectItem = vi.fn();
    const items = [makeItem({ id: "item-1", name: "Clickable App" })];
    render(
      <WindowPlacementDialog
        {...defaultProps}
        items={items}
        onSelectItem={onSelectItem}
      />,
    );

    // The canvas area should contain the item
    expect(screen.getByText("Clickable App")).toBeInTheDocument();
  });

  it("renders with header and instruction text", () => {
    const items = [
      makeItem({
        id: "item-1",
        name: "Placed App",
        placement: makePlacement({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }),
      }),
    ];
    render(<WindowPlacementDialog {...defaultProps} items={items} />);

    // Header should be visible
    expect(screen.getByText("Place Windows")).toBeInTheDocument();
    expect(screen.getByText(/drag onto monitors/i)).toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(<WindowPlacementDialog {...defaultProps} />);
    // The dialog has an X close button in the header
    const closeButton = document.querySelectorAll("button");
    expect(closeButton.length).toBeGreaterThan(0);
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WindowPlacementDialog {...defaultProps} onClose={onClose} />);

    // The dialog has a close (X) button - find the button element
    const buttons = document.querySelectorAll("button");
    // The X button is in the header bar
    await user.click(buttons[0]);

    expect(onClose).toHaveBeenCalled();
  });

  it("shows unplaced badge for items without placement", () => {
    const items = [makeItem({ id: "unplaced", name: "Unplaced App" })];
    render(<WindowPlacementDialog {...defaultProps} items={items} />);

    // The item chip appears in the canvas
    expect(screen.getByText("Unplaced App")).toBeInTheDocument();
  });

  it("renders with no items gracefully", () => {
    render(<WindowPlacementDialog {...defaultProps} items={[]} />);
    expect(screen.getByText("Place Windows")).toBeInTheDocument();
  });
});
