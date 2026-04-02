import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMonitors } from "./useMonitors";
import { invoke } from "@tauri-apps/api/core";
import type { MonitorInfo } from "@/types";

vi.mock("@tauri-apps/api/core");

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("useMonitors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Tauri monitors when invoke resolves", () => {
    const tauriMonitors: MonitorInfo[] = [
      {
        index: 0,
        name: "Display 1",
        width: 3840,
        height: 2160,
        x: 0,
        y: 0,
        scaleFactor: 1.5,
      },
      {
        index: 1,
        name: "Display 2",
        width: 1920,
        height: 1080,
        x: 3840,
        y: 1071,
        scaleFactor: 1,
      },
    ];
    mockInvoke.mockResolvedValueOnce(tauriMonitors);

    const { result } = renderHook(() => useMonitors());

    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe("Display 1");
    expect(result.current[1].name).toBe("Display 2");
  });

  it("returns fallback monitors when invoke rejects", () => {
    mockInvoke.mockResolvedValueOnce(
      Promise.reject(new Error("Tauri unavailable")),
    );

    const { result } = renderHook(() => useMonitors());

    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe("Display 1");
    expect(result.current[1].name).toBe("Display 2");
  });

  it("uses correct fallback monitor positions", () => {
    mockInvoke.mockResolvedValueOnce(
      Promise.reject(new Error("Tauri unavailable")),
    );

    const { result } = renderHook(() => useMonitors());

    expect(result.current[0].x).toBe(0);
    expect(result.current[0].y).toBe(0);
    expect(result.current[1].x).toBe(1920);
    expect(result.current[1].y).toBe(0);
  });
});
