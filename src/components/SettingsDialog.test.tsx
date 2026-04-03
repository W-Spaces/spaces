import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { SettingsDialog } from "./SettingsDialog";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("renders settings dialog when open", () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText(/launch on startup/i)).toBeInTheDocument();
    expect(screen.getByText(/minimize to tray/i)).toBeInTheDocument();
    expect(screen.getByText(/default shell/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-save interval/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<SettingsDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("calls onClose when Done is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsDialog open={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when dialog is closed via overlay", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsDialog open={true} onClose={onClose} />);

    // Click the overlay to close (DialogOverlay covers the screen)
    const overlay = document.querySelector(
      "[data-state='open']",
    ) as HTMLElement;
    if (overlay) {
      // The overlay is behind the content; close via the X button or Escape
      await user.keyboard("{Escape}");
    }
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles launch on startup setting", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const toggle = screen.getByRole("switch", { name: /launch on startup/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("toggles minimize to tray setting", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const toggle = screen.getByRole("switch", { name: /minimize to tray/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("changes default shell", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const select = screen.getByRole("combobox", { name: /default shell/i });
    expect(select).toHaveValue("powershell");

    await user.selectOptions(select, "wt");
    expect(select).toHaveValue("wt");
  });

  it("changes auto-save interval", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const select = screen.getByRole("combobox", {
      name: /auto-save interval/i,
    });
    expect(select).toHaveValue("30");

    await user.selectOptions(select, "60");
    expect(select).toHaveValue("60");
  });

  it("resets settings to defaults", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    // Change a setting first
    const toggle = screen.getByRole("switch", { name: /launch on startup/i });
    await user.click(toggle);

    // Reset
    await user.click(
      screen.getByRole("button", { name: /reset to defaults/i }),
    );

    // Toggle should be back to off
    expect(toggle).toHaveAttribute("aria-checked", "false");
    // appSearchPaths should be back to defaults
    expect(screen.getByText("C:\\Program Files")).toBeInTheDocument();
  });

  it("renders default app search paths", () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/app search directories/i)).toBeInTheDocument();
    expect(screen.getByText("C:\\Program Files")).toBeInTheDocument();
    expect(screen.getByText("C:\\Program Files (x86)")).toBeInTheDocument();
  });

  it("removes an app search path", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const removeButtons = screen.getAllByRole("button", {
      name: /remove directory/i,
    });
    // Remove "C:\\Program Files (x86)"
    await user.click(removeButtons[1]);

    expect(
      screen.queryByText("C:\\Program Files (x86)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("C:\\Program Files")).toBeInTheDocument();
  });

  it("adds a new app search path", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText("C:\\Program Files\\My App");
    await user.type(input, "D:\\My Apps");

    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    expect(screen.getByText("D:\\My Apps")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("does not add duplicate app search paths", async () => {
    const user = userEvent.setup();
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    // Try to add an existing path
    const input = screen.getByPlaceholderText("C:\\Program Files\\My App");
    await user.type(input, "C:\\Program Files");

    const addButton = screen.getByRole("button", { name: /add/i });
    await user.click(addButton);

    // Should still only have the original (no duplicate)
    const pathTexts = screen.getAllByText("C:\\Program Files");
    expect(pathTexts.length).toBe(1);
  });

  it("shows empty placeholder when all paths removed", async () => {
    const user = userEvent.setup();
    // Pre-clear storage and set empty paths
    localStorage.setItem(
      "spaces-app-settings",
      JSON.stringify({ appSearchPaths: [] }),
    );
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    // Remove remaining paths
    const removeButtons = screen.queryAllByRole("button", {
      name: /remove directory/i,
    });
    for (const btn of removeButtons) {
      await user.click(btn);
    }

    // Should show the add input still
    expect(
      screen.getByPlaceholderText("C:\\Program Files\\My App"),
    ).toBeInTheDocument();
  });

  it("renders config path section", () => {
    render(<SettingsDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/config save location/i)).toBeInTheDocument();
    expect(screen.getByText("Default (AppData)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
  });

  it("shows custom config path when set", () => {
    localStorage.setItem(
      "spaces-app-settings",
      JSON.stringify({ configPath: "D:\\My Spaces" }),
    );
    render(<SettingsDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("D:\\My Spaces")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("calls pick_config_dir when Browse is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(invoke).mockResolvedValue("E:\\Config");
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /browse/i }));
    expect(invoke).toHaveBeenCalledWith("pick_config_dir");
  });

  it("clears config path when Clear is clicked", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "spaces-app-settings",
      JSON.stringify({ configPath: "D:\\My Spaces" }),
    );
    render(<SettingsDialog open={true} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText("Default (AppData)")).toBeInTheDocument();
  });
});
