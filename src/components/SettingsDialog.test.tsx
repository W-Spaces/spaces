import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsDialog } from "./SettingsDialog";
import type { Space, StartupConfig } from "@/types";

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
  open: true,
  spaces: [] as Space[],
  startupConfig: null as StartupConfig | null,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog title", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders the Startup Space label", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByText("Startup Space")).toBeInTheDocument();
  });

  it("renders Save Changes and Cancel buttons", () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSave with null when no space selected and Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SettingsDialog {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("shows spaces in the dropdown", async () => {
    const user = userEvent.setup();
    const spaces = [
      makeSpace({ id: "s1", name: "Dev Space" }),
      makeSpace({ id: "s2", name: "Work Space" }),
    ];
    render(<SettingsDialog {...defaultProps} spaces={spaces} />);

    // Open the select dropdown
    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("Dev Space")).toBeInTheDocument();
    expect(screen.getByText("Work Space")).toBeInTheDocument();
  });

  it("pre-selects the current startup config space", async () => {
    const spaces = [makeSpace({ id: "s1", name: "Dev Space" })];
    const startupConfig: StartupConfig = { type: "space", id: "s1" };
    render(
      <SettingsDialog
        {...defaultProps}
        spaces={spaces}
        startupConfig={startupConfig}
      />,
    );

    // The selected space name should be visible in the trigger
    expect(screen.getByRole("combobox")).toHaveTextContent("Dev Space");
  });

  it("calls onSave with space config when a space is selected and saved", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const spaces = [makeSpace({ id: "s1", name: "Dev Space" })];
    render(<SettingsDialog {...defaultProps} spaces={spaces} onSave={onSave} />);

    // Open the dropdown
    await user.click(screen.getByRole("combobox"));
    // Select Dev Space
    await user.click(screen.getByText("Dev Space"));
    // Save
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ type: "space", id: "s1" });
  });

  it("does not render when closed", () => {
    render(<SettingsDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });
});
