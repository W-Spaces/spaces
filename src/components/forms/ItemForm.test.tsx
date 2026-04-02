import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemForm } from "./ItemForm";
import type { SpaceItem } from "@/types";

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe("ItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders add item form when open with no initial", () => {
      render(<ItemForm {...defaultProps} />);
      expect(screen.queryAllByText("Add Item").length).toBeGreaterThan(0);
    });

    it("renders edit item form when initial is provided", () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "Notepad",
        path: "notepad.exe",
        args: [],
      };
      render(<ItemForm {...defaultProps} initial={item} />);
      expect(screen.getByText("Edit Item")).toBeInTheDocument();
    });

    it("shows application fields by default", () => {
      render(<ItemForm {...defaultProps} />);
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/executable path/i)).toBeInTheDocument();
    });

    it("pre-fills fields when editing an application item", () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "VS Code",
        path: "C:\\Code\\Code.exe",
        args: ["--new-window"],
      };
      render(<ItemForm {...defaultProps} initial={item} />);
      expect(screen.getByDisplayValue("VS Code")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("C:\\Code\\Code.exe"),
      ).toBeInTheDocument();
    });

    it("shows URL fields when editing a URL item", () => {
      const item: SpaceItem = {
        id: "3",
        type: "url",
        name: "GitHub",
        url: "https://github.com",
      };
      render(<ItemForm {...defaultProps} initial={item} />);
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });

    it("shows script fields when editing a script item", () => {
      const item: SpaceItem = {
        id: "4",
        type: "script",
        name: "Build",
        content: "npm run build",
        shell: "powershell",
        cwd: "C:\\project",
      };
      render(<ItemForm {...defaultProps} initial={item} />);
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/working directory/i)).toBeInTheDocument();
    });
  });

  describe("type switching", () => {
    it("hides type selector when editing an existing item", () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "App",
        path: "app.exe",
        args: [],
      };
      render(<ItemForm {...defaultProps} initial={item} />);
      const typeSelect = document.querySelector(
        '[role="combobox"]',
      ) as HTMLButtonElement;
      expect(typeSelect).toBeDisabled();
    });
  });

  describe("validation", () => {
    it("does not submit when name is empty", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<ItemForm {...defaultProps} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole("button", { name: /add item/i });
      await user.click(submitButton);

      expect(onSave).not.toHaveBeenCalled();
    });

    it("trims whitespace from name", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<ItemForm {...defaultProps} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "  Trimmed App  ");

      const submitButton = screen.getByRole("button", { name: /add item/i });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Trimmed App" }),
      );
    });
  });

  describe("application item", () => {
    it("saves application item with path and args", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<ItemForm {...defaultProps} onSave={onSave} />);

      await user.type(screen.getByLabelText(/name/i), "Notepad");
      await user.type(screen.getByLabelText(/executable path/i), "notepad.exe");

      await user.click(screen.getByRole("button", { name: /add item/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "application",
          name: "Notepad",
          path: "notepad.exe",
          args: [],
        }),
      );
    });
  });

  describe("url item", () => {
    it("saves url item with url string", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      // Initialize directly as URL type - type switching via Radix Select is tested separately
      const urlItem: SpaceItem = {
        id: "3",
        type: "url",
        name: "GitHub",
        url: "https://github.com",
      };
      render(<ItemForm {...defaultProps} initial={urlItem} onSave={onSave} />);

      // URL fields should already be visible since we initialized with a URL item
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("GitHub")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://github.com"),
      ).toBeInTheDocument();

      // Edit the URL and save
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "GitLab");

      const urlInput = screen.getByLabelText(/url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://gitlab.com");

      await user.click(screen.getByRole("button", { name: /save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "url",
          name: "GitLab",
          url: "https://gitlab.com",
        }),
      );
    });
  });

  describe("script item", () => {
    it("saves script item with content, shell and cwd", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<ItemForm {...defaultProps} onSave={onSave} />);

      // Click the type selector to open the dropdown
      const typeSelect = document.querySelector(
        '[role="combobox"]',
      ) as HTMLButtonElement;
      await user.click(typeSelect);

      // Press S to select Script
      await user.keyboard("S");

      // Wait for script fields to appear
      await user.type(screen.getByLabelText(/name/i), "Build Script");
      await user.type(screen.getByLabelText(/content/i), "npm run build");
      await user.type(
        screen.getByLabelText(/working directory/i),
        "C:\\project",
      );

      await user.click(screen.getByRole("button", { name: /add item/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "script",
          name: "Build Script",
          content: "npm run build",
          shell: "powershell",
          cwd: "C:\\project",
        }),
      );
    });
  });
});
