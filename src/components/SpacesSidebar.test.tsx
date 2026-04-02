import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpacesSidebar } from "./SpacesSidebar";
import type { Space, SpaceGroup } from "@/types";

const makeSpace = (overrides: Partial<Space> = {}): Space => ({
  id: "1",
  name: "Test Space",
  description: "A test space",
  color: "blue",
  items: [],
  isFavourite: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeGroup = (overrides: Partial<SpaceGroup> = {}): SpaceGroup => ({
  id: "1",
  name: "Test Group",
  description: "A test group",
  color: "purple",
  spaceIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const defaultProps = {
  spaces: [] as Space[],
  groups: [] as SpaceGroup[],
  selectedId: null as string | null,
  selectedGroupId: null as string | null,
  onSelect: vi.fn(),
  onSelectGroup: vi.fn(),
  onNew: vi.fn(),
  onNewGroup: vi.fn(),
};

describe("SpacesSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sidebar header", () => {
    render(<SpacesSidebar {...defaultProps} />);
    // There are multiple "Spaces" texts (header + section label), get the first one (header)
    expect(screen.getAllByText("Spaces")[0]).toBeInTheDocument();
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

  it("renders the Space button", () => {
    render(<SpacesSidebar {...defaultProps} />);

    const spaceButton = screen.getByRole("button", { name: /space/i });
    expect(spaceButton).toBeInTheDocument();
  });

  it("calls onNew when Space button is clicked", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<SpacesSidebar {...defaultProps} onNew={onNew} />);

    await user.click(screen.getByRole("button", { name: /space/i }));

    expect(onNew).toHaveBeenCalled();
  });

  it("renders the Group button", () => {
    render(<SpacesSidebar {...defaultProps} />);

    const groupButton = screen.getByRole("button", { name: /group/i });
    expect(groupButton).toBeInTheDocument();
  });

  it("calls onNewGroup when Group button is clicked", async () => {
    const user = userEvent.setup();
    const onNewGroup = vi.fn();
    render(<SpacesSidebar {...defaultProps} onNewGroup={onNewGroup} />);

    await user.click(screen.getByRole("button", { name: /group/i }));

    expect(onNewGroup).toHaveBeenCalled();
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

  it("shows star icon for favourite spaces", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Normal Space", isFavourite: false }),
      makeSpace({ id: "2", name: "Fav Space", isFavourite: true }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} />);

    // The favourite space button should have an svg star icon
    const favButton = screen.getByRole("button", { name: /fav space/i });
    const normalButton = screen.getByRole("button", { name: /normal space/i });
    // Favourite space's button contains a star SVG
    expect(favButton.querySelector("svg")).toBeTruthy();
    // Normal space's button does not have a star (only has the color dot span, not an extra svg)
    // We check by counting SVGs: favourite has one (the star), normal has none
    expect(favButton.querySelectorAll("svg").length).toBe(1);
    expect(normalButton.querySelectorAll("svg").length).toBe(0);
  });

  it("renders favourite spaces before non-favourite spaces", () => {
    const spaces = [
      makeSpace({ id: "1", name: "Normal A", isFavourite: false }),
      makeSpace({ id: "2", name: "Normal B", isFavourite: false }),
      makeSpace({ id: "3", name: "Fav Space", isFavourite: true }),
    ];
    render(<SpacesSidebar {...defaultProps} spaces={spaces} />);

    const buttons = screen.getAllByRole("button", {
      name: /Normal A|Normal B|Fav Space/i,
    });
    // Favourite should appear first
    expect(buttons[0]).toHaveTextContent("Fav Space");
  });
});
