import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { AppBrowser } from "./AppBrowser";
import type { DiscoveredApp } from "@/types";

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSelect: vi.fn(),
};

const mockApps: DiscoveredApp[] = [
  { name: "VS Code", path: "C:\\Code\\Code.exe", iconBase64: "" },
  { name: "Notepad++", path: "C:\\Notepad++\\notepad++.exe", iconBase64: "abc123" },
  { name: "Firefox", path: "C:\\Firefox\\firefox.exe", iconBase64: "" },
];

describe("AppBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("shows loading state while fetching apps", async () => {
      vi.mocked(invoke).mockImplementation(
        () => new Promise(() => {}), // never resolves
      );
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      expect(screen.getByText(/discovering apps/i)).toBeInTheDocument();
    });

    it("renders discovered apps after loading", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText("VS Code")).toBeInTheDocument();
        expect(screen.getByText("Notepad++")).toBeInTheDocument();
        expect(screen.getByText("Firefox")).toBeInTheDocument();
      });
    });

    it("shows 'No apps found' when list is empty", async () => {
      vi.mocked(invoke).mockResolvedValueOnce([]);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText(/no apps found/i)).toBeInTheDocument();
      });
    });

    it("shows 'No apps found' when invoke rejects", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("fail"));
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText(/no apps found/i)).toBeInTheDocument();
      });
    });

    it("shows app path as description", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText("C:\\Code\\Code.exe")).toBeInTheDocument();
      });
    });

    it("renders an img tag for apps with iconBase64", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        const imgs = document.querySelectorAll("img");
        expect(imgs.length).toBeGreaterThan(0);
        const src = imgs[0].getAttribute("src");
        expect(src).toContain("data:image/png;base64,abc123");
      });
    });
  });

  describe("search", () => {
    it("filters apps by name", async () => {
      const user = userEvent.setup();
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText("VS Code")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/search apps/i), "code");

      expect(screen.getByText("VS Code")).toBeInTheDocument();
      expect(screen.queryByText("Notepad++")).not.toBeInTheDocument();
      expect(screen.queryByText("Firefox")).not.toBeInTheDocument();
    });

    it("filters apps by path", async () => {
      const user = userEvent.setup();
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText("Firefox")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/search apps/i), "firefox");

      expect(screen.getByText("Firefox")).toBeInTheDocument();
      expect(screen.queryByText("VS Code")).not.toBeInTheDocument();
    });

    it("shows no apps found when search matches nothing", async () => {
      const user = userEvent.setup();
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(<AppBrowser {...defaultProps} />);
      });
      await waitFor(() => {
        expect(screen.getByText("VS Code")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/search apps/i), "zzznomatch");

      expect(screen.getByText(/no apps found/i)).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect and onClose when an app is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onClose = vi.fn();
      vi.mocked(invoke).mockResolvedValueOnce(mockApps);
      await act(async () => {
        render(
          <AppBrowser open={true} onClose={onClose} onSelect={onSelect} />,
        );
      });
      await waitFor(() => {
        expect(screen.getByText("VS Code")).toBeInTheDocument();
      });

      await user.click(screen.getByText("VS Code"));

      expect(onSelect).toHaveBeenCalledWith(mockApps[0]);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("dialog behavior", () => {
    it("does not fetch when closed", () => {
      render(<AppBrowser open={false} onClose={vi.fn()} onSelect={vi.fn()} />);
      expect(invoke).not.toHaveBeenCalled();
    });

    it("re-fetches when reopened", async () => {
      vi.mocked(invoke).mockResolvedValue(mockApps);
      const { rerender } = render(
        <AppBrowser open={false} onClose={vi.fn()} onSelect={vi.fn()} />,
      );
      expect(invoke).not.toHaveBeenCalled();

      await act(async () => {
        rerender(
          <AppBrowser open={true} onClose={vi.fn()} onSelect={vi.fn()} />,
        );
      });
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("discover_apps");
      });
    });
  });
});
