import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemForm } from "./ItemForm";
import type { SpaceItem, SavedApp } from "@/types";
import * as dialog from "@tauri-apps/plugin-dialog";

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
    it("renders add item form when open and no initial", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });
      expect(screen.queryAllByText("Add Item").length).toBeGreaterThan(0);
    });

    it("renders edit item form when initial is provided", async () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "Notepad",
        path: "notepad.exe",
        args: [],
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
      expect(screen.getByText("Edit Item")).toBeInTheDocument();
    });

    it("shows application fields by default", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/executable path/i)).toBeInTheDocument();
    });

    it("pre-fills fields when editing an application item", async () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "VS Code",
        path: "C:\\Code\\Code.exe",
        args: ["--new-window"],
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
      expect(screen.getByDisplayValue("VS Code")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("C:\\Code\\Code.exe"),
      ).toBeInTheDocument();
    });

    it("shows URL fields when editing a URL item", async () => {
      const item: SpaceItem = {
        id: "3",
        type: "url",
        name: "GitHub",
        url: "https://github.com",
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });

    it("shows script fields when editing a script item", async () => {
      const item: SpaceItem = {
        id: "4",
        type: "script",
        name: "Build",
        content: "npm run build",
        shell: "powershell",
        cwd: "C:\\project",
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/working directory/i)).toBeInTheDocument();
    });
  });

  describe("type switching", () => {
    it("hides type selector when editing an existing item", async () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "App",
        path: "app.exe",
        args: [],
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
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
      await act(async () => {
        render(<ItemForm {...defaultProps} onSave={onSave} />);
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole("button", { name: /add item/i });
      await user.click(submitButton);

      expect(onSave).not.toHaveBeenCalled();
    });

    it("trims whitespace from name", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      await act(async () => {
        render(<ItemForm {...defaultProps} onSave={onSave} />);
      });

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
      await act(async () => {
        render(<ItemForm {...defaultProps} onSave={onSave} />);
      });

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
      await act(async () => {
        render(
          <ItemForm {...defaultProps} initial={urlItem} onSave={onSave} />,
        );
      });

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
      const scriptItem: SpaceItem = {
        id: "4",
        type: "script",
        name: "Build Script",
        content: "npm run build",
        shell: "powershell",
        cwd: "C:\\project",
      };
      await act(async () => {
        render(
          <ItemForm {...defaultProps} initial={scriptItem} onSave={onSave} />,
        );
      });

      await user.click(screen.getByRole("button", { name: /save/i }));

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

  describe("saved apps", () => {
    const savedApps: SavedApp[] = [
      { id: "app-1", name: "VS Code", path: "C:\\Code\\Code.exe" },
      { id: "app-2", name: "Notepad++", path: "C:\\Notepad++\\notepad++.exe" },
    ];

    it("shows saved apps selector when savedApps are provided", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} savedApps={savedApps} />);
      });
      expect(screen.getByText(/saved apps/i)).toBeInTheDocument();
    });

    it("does not show saved apps selector when savedApps is empty", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} savedApps={[]} />);
      });
      expect(screen.queryByText(/saved apps/i)).not.toBeInTheDocument();
    });

    it("shows save as app checkbox for new items", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });
      expect(
        screen.getByLabelText(/save as app for quick access/i),
      ).toBeInTheDocument();
    });

    it("does not show save as app checkbox when editing an existing item", async () => {
      const item: SpaceItem = {
        id: "1",
        type: "application",
        name: "VS Code",
        path: "C:\\Code\\Code.exe",
        args: [],
      };
      await act(async () => {
        render(<ItemForm {...defaultProps} initial={item} />);
      });
      expect(
        screen.queryByLabelText(/save as app for quick access/i),
      ).not.toBeInTheDocument();
    });

    it("calls onSaveApp when save as app checkbox is checked and form submitted", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onSaveApp = vi.fn();
      await act(async () => {
        render(
          <ItemForm
            {...defaultProps}
            onSave={onSave}
            onSaveApp={onSaveApp}
          />,
        );
      });

      await user.type(screen.getByLabelText(/name/i), "My App");
      await user.type(
        screen.getByLabelText(/executable path/i),
        "C:\\myapp.exe",
      );

      const checkbox = screen.getByLabelText(/save as app for quick access/i);
      await user.click(checkbox);

      await user.click(screen.getByRole("button", { name: /add item/i }));

      expect(onSave).toHaveBeenCalled();
      expect(onSaveApp).toHaveBeenCalledWith("My App", "C:\\myapp.exe");
    });

    it("does not call onSaveApp when checkbox is unchecked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onSaveApp = vi.fn();
      await act(async () => {
        render(
          <ItemForm
            {...defaultProps}
            onSave={onSave}
            onSaveApp={onSaveApp}
          />,
        );
      });

      await user.type(screen.getByLabelText(/name/i), "My App");
      await user.type(
        screen.getByLabelText(/executable path/i),
        "C:\\myapp.exe",
      );

      await user.click(screen.getByRole("button", { name: /add item/i }));

      expect(onSave).toHaveBeenCalled();
      expect(onSaveApp).not.toHaveBeenCalled();
    });
  });

  describe("browse for executable", () => {
    it("shows browse button for application type", async () => {
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });
      expect(
        screen.getByRole("button", { name: /browse for executable/i }),
      ).toBeInTheDocument();
    });

    it("fills path from dialog and auto-fills name from filename", async () => {
      const user = userEvent.setup();
      vi.mocked(dialog.open).mockResolvedValueOnce(
        "C:\\Program Files\\MyApp\\myapp.exe",
      );
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });

      await user.click(
        screen.getByRole("button", { name: /browse for executable/i }),
      );

      await act(async () => {});

      expect(
        screen.getByDisplayValue("C:\\Program Files\\MyApp\\myapp.exe"),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("myapp")).toBeInTheDocument();
    });

    it("does not overwrite an existing name when browsing", async () => {
      const user = userEvent.setup();
      vi.mocked(dialog.open).mockResolvedValueOnce("C:\\other.exe");
      await act(async () => {
        render(<ItemForm {...defaultProps} />);
      });

      await user.type(screen.getByLabelText(/name/i), "Existing Name");
      await user.click(
        screen.getByRole("button", { name: /browse for executable/i }),
      );

      await act(async () => {});

      expect(screen.getByDisplayValue("Existing Name")).toBeInTheDocument();
    });
  });
});
