import { describe, it, expect } from "vitest";
import {
  ITEM_TYPE_LABELS,
  SPACE_COLORS,
  type Space,
  type SpaceItem,
  type ApplicationItem,
  type TerminalItem,
  type UrlItem,
  type ScriptItem,
  type WindowPlacement,
  type MonitorInfo,
} from "./types";

describe("ITEM_TYPE_LABELS", () => {
  it("has labels for all item types", () => {
    expect(ITEM_TYPE_LABELS.application).toBe("Application");
    expect(ITEM_TYPE_LABELS.terminal).toBe("Terminal");
    expect(ITEM_TYPE_LABELS.url).toBe("URL");
    expect(ITEM_TYPE_LABELS.script).toBe("Script");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(ITEM_TYPE_LABELS)).toHaveLength(4);
  });
});

describe("SPACE_COLORS", () => {
  it("has at least one color option", () => {
    expect(SPACE_COLORS.length).toBeGreaterThan(0);
  });

  it("each color has value, label, and class", () => {
    for (const color of SPACE_COLORS) {
      expect(color).toHaveProperty("value");
      expect(color).toHaveProperty("label");
      expect(color).toHaveProperty("class");
      expect(typeof color.value).toBe("string");
      expect(typeof color.label).toBe("string");
      expect(typeof color.class).toBe("string");
    }
  });

  it("includes the blue color", () => {
    const blue = SPACE_COLORS.find((c) => c.value === "blue");
    expect(blue).toBeDefined();
    expect(blue?.class).toContain("bg-blue-500");
  });
});

describe("WindowPlacement", () => {
  it("accepts a valid placement object", () => {
    const placement: WindowPlacement = {
      monitorIndex: 0,
      x: 0.5,
      y: 0,
      w: 0.5,
      h: 1,
      monitorX: 0,
      monitorY: 0,
      monitorWidth: 1920,
      monitorHeight: 1080,
    };
    expect(placement.x).toBe(0.5);
    expect(placement.monitorWidth).toBe(1920);
  });

  it("supports zero coordinates", () => {
    const placement: WindowPlacement = {
      monitorIndex: 1,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      monitorX: 1920,
      monitorY: 0,
      monitorWidth: 1920,
      monitorHeight: 1080,
    };
    expect(placement.x).toBe(0);
    expect(placement.w).toBe(1);
  });
});

describe("MonitorInfo", () => {
  it("accepts a valid monitor info object", () => {
    const monitor: MonitorInfo = {
      index: 0,
      name: "Display 1",
      width: 3840,
      height: 2160,
      x: 0,
      y: 0,
      scaleFactor: 1.5,
    };
    expect(monitor.scaleFactor).toBe(1.5);
    expect(monitor.name).toBe("Display 1");
  });
});

describe("Space item types", () => {
  it("accepts an ApplicationItem", () => {
    const item: ApplicationItem = {
      id: "1",
      type: "application",
      name: "VS Code",
      path: "C:\\Program Files\\Microsoft VS Code\\Code.exe",
      args: ["--new-window"],
      placement: {
        monitorIndex: 0,
        x: 0,
        y: 0,
        w: 0.5,
        h: 1,
        monitorX: 0,
        monitorY: 0,
        monitorWidth: 1920,
        monitorHeight: 1080,
      },
    };
    expect(item.type).toBe("application");
    expect(item.args).toContain("--new-window");
  });

  it("accepts a TerminalItem", () => {
    const item: TerminalItem = {
      id: "2",
      type: "terminal",
      name: "PowerShell",
      cwd: "C:\\Users",
      commands: ["ls", "dir"],
      shell: "powershell",
    };
    expect(item.type).toBe("terminal");
    expect(item.shell).toBe("powershell");
  });

  it("accepts a UrlItem", () => {
    const item: UrlItem = {
      id: "3",
      type: "url",
      name: "GitHub",
      url: "https://github.com",
    };
    expect(item.type).toBe("url");
    expect(item.url).toBe("https://github.com");
  });

  it("accepts a ScriptItem", () => {
    const item: ScriptItem = {
      id: "4",
      type: "script",
      name: "Build script",
      content: "npm run build",
      shell: "powershell",
      cwd: "C:\\project",
    };
    expect(item.type).toBe("script");
    expect(item.shell).toBe("powershell");
  });

  it("SpaceItem union accepts all four types", () => {
    const items: SpaceItem[] = [
      { id: "1", type: "application", name: "App", path: "", args: [] },
      {
        id: "2",
        type: "terminal",
        name: "Term",
        cwd: "",
        commands: [],
        shell: "wt",
      },
      { id: "3", type: "url", name: "URL", url: "https://example.com" },
      {
        id: "4",
        type: "script",
        name: "Script",
        content: "",
        shell: "cmd",
        cwd: "",
      },
    ];
    expect(items).toHaveLength(4);
  });
});

describe("Space", () => {
  it("accepts a valid Space object", () => {
    const space: Space = {
      id: "space-1",
      name: "Development",
      description: "My dev environment",
      color: "blue",
      items: [],
      isFavourite: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(space.name).toBe("Development");
    expect(space.items).toHaveLength(0);
    expect(space.isFavourite).toBe(false);
  });

  it("accepts a Space with items", () => {
    const space: Space = {
      id: "space-2",
      name: "With Items",
      description: "",
      color: "green",
      items: [
        {
          id: "1",
          type: "application",
          name: "Notepad",
          path: "notepad.exe",
          args: [],
        },
        { id: "2", type: "url", name: "Docs", url: "https://docs.rs" },
      ],
      isFavourite: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(space.items).toHaveLength(2);
    expect(space.isFavourite).toBe(true);
  });
});
