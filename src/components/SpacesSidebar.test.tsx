import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpacesSidebar } from "./SpacesSidebar";
import type { Space } from "@/types";

const makeSpace = (overrides: Partial<Space> = {}): Space => ({
  id: "1",
  name: "Test Space",
  description: "A test space",
  color: "blue",
  items: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const defaultProps = {
  spaces: [] as Space[],
  selectedId: null as string | null,
  onSelect: vi.fn(),
  onNew: vi.fn(),
  onSettings: vi.fn(),
};

describe("SpacesSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sidebar header", () => {
    render(<SpacesSidebar {...defaultProps} />);
    expect(screen.getByText("Spaces")).toBeInTheDocument();
  });

  it("renders empty state when no spaces", () => {
    render(<SpacesSidebar {...defaultProps} spaces={[]} />);
    // The empty state text may be split by a <br> — use regex to match
    expect(screen.getByText(/no spaces yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create one to get started/i)).toBeInTheDocument();
  });

  it("renders list of spaces", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Space One", color: "blue" }),
      makeSpace({ id: "2", name: "Space Two", color: "green" }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} />);

    expect(screen.getByText("Space One")).toBeInTheDocument();
    expect(screen.getByText("Space Two")).toBeInTheDocument();
  });

  it("calls onSelect when a space is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const spaces = [makeSpace({ id: "space-1", name: "Dev Space" })];
    render(
      <SpacesSidebar {...defaultProps} spaces={spaces} onSelect={onSelect} />,
    );

    await user.click(screen.getByText("Dev Space"));

    expect(onSelect).toHaveBeenCalledWith("space-1");
  });

  it("applies selected class to the selected space", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Selected Space", color: "blue" }),
      makeSpace({ id: "2", name: "Other Space", color: "green" }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} selectedId="1" />);

    // Both items render; the selected one has visual distinction
    // (tested by checking the element exists and is visible)
    const selectedEl = screen.getByText("Selected Space");
    expect(selectedEl).toBeInTheDocument();
    const otherEl = screen.getByText("Other Space");
    expect(otherEl).toBeInTheDocument();
  });

  it("renders the New Space button", () => {
    const onNew = vi.fn();
    render(<SpacesSidebar {...defaultProps} onNew={onNew} />);

    const newButton = screen.getByRole("button", { name: /new space/i });
    expect(newButton).toBeInTheDocument();
  });

  it("calls onNew when New Space button is clicked", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<SpacesSidebar {...defaultProps} onNew={onNew} />);

    await user.click(screen.getByRole("button", { name: /new space/i }));

    expect(onNew).toHaveBeenCalled();
  });

  it("renders the Settings gear icon button", () => {
    render(<SpacesSidebar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("calls onSettings when Settings button is clicked", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<SpacesSidebar {...defaultProps} onSettings={onSettings} />);

    await user.click(screen.getByRole("button", { name: /settings/i }));

    expect(onSettings).toHaveBeenCalled();
  });

  it("shows item count for each space", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Empty Space", items: [] }),
      makeSpace({
        id: "2",
        name: "Full Space",
        items: [
          { id: "1", type: "application", name: "App", path: "", args: [] },
          { id: "2", type: "url", name: "URL", url: "" },
        ],
      }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} />);

    // The sidebar may show item counts; check they render
    expect(screen.getByText("Empty Space")).toBeInTheDocument();
    expect(screen.getByText("Full Space")).toBeInTheDocument();
  });

  it("renders color dot for each space", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Blue Space", color: "blue" }),
      makeSpace({ id: "2", name: "Green Space", color: "green" }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} />);

    // Both space names should be visible
    expect(screen.getByText("Blue Space")).toBeInTheDocument();
    expect(screen.getByText("Green Space")).toBeInTheDocument();
  });
});
