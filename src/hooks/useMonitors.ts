import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MonitorInfo } from "@/types";

// Two mock monitors used in browser dev or when Tauri is unavailable
const FALLBACK_MONITORS: MonitorInfo[] = [
  {
    index: 0,
    name: "Display 1",
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    scaleFactor: 1,
  },
  {
    index: 1,
    name: "Display 2",
    width: 1920,
    height: 1080,
    x: 1920,
    y: 0,
    scaleFactor: 1,
  },
];

export function useMonitors(): MonitorInfo[] {
  const [monitors, setMonitors] = useState<MonitorInfo[]>(FALLBACK_MONITORS);

  useEffect(() => {
    invoke<MonitorInfo[]>("get_monitors")
      .then((list) => {
        if (list.length > 0) setMonitors(list);
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  return monitors;
}
