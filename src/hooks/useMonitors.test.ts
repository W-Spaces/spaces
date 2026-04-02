import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMonitors } from "./useMonitors";
import { invoke } from "@tauri-apps/api/core";
import type { MonitorInfo } from "@/types";

vi.mock("@tauri-apps/api/core");

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("useMonitors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Tauri monitors when invoke resolves", async () => {
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

    let hookResult: { current: ReturnType<typeof useMonitors> };
    await act(async () => {
      const { result } = renderHook(() => useMonitors());
      hookResult = result;
    });

    expect(hookResult!.current).toHaveLength(2);
    expect(hookResult!.current[0].name).toBe("Display 1");
    expect(hookResult!.current[1].name).toBe("Display 2");
  });

  it("returns fallback monitors when invoke rejects", async () => {
    mockInvoke.mockResolvedValueOnce(
      Promise.reject(new Error("Tauri unavailable")),
    );

    let hookResult: { current: ReturnType<typeof useMonitors> };
    await act(async () => {
      const { result } = renderHook(() => useMonitors());
      hookResult = result;
    });

    expect(hookResult!.current).toHaveLength(2);
    expect(hookResult!.current[0].name).toBe("Display 1");
    expect(hookResult!.current[1].name).toBe("Display 2");
  });

  it("uses correct fallback monitor positions", async () => {
    mockInvoke.mockResolvedValueOnce(
      Promise.reject(new Error("Tauri unavailable")),
    );

    let hookResult: { current: ReturnType<typeof useMonitors> };
    await act(async () => {
      const { result } = renderHook(() => useMonitors());
      hookResult = result;
    });

    expect(hookResult!.current[0].x).toBe(0);
    expect(hookResult!.current[0].y).toBe(0);
    expect(hookResult!.current[1].x).toBe(1920);
    expect(hookResult!.current[1].y).toBe(0);
  });
});
