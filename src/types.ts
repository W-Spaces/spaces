export type SpaceItemType = "application" | "terminal" | "url" | "script";

// â”€â”€ Window placement on a monitor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface WindowPlacement {
  monitorIndex: number;
  /** 0â€“1 fraction of monitor width */
  x: number;
  /** 0â€“1 fraction of monitor height */
  y: number;
  /** 0â€“1 fraction of monitor width */
  w: number;
  /** 0â€“1 fraction of monitor height */
  h: number; /** Absolute physical-pixel left edge of the target monitor (for backend) */
  monitorX: number;
  /** Absolute physical-pixel top edge of the target monitor (for backend) */
  monitorY: number;
  /** Physical-pixel width of the target monitor (for backend) */
  monitorWidth: number;
  /** Physical-pixel height of the target monitor (for backend) */
  monitorHeight: number;
}

export interface MonitorInfo {
  index: number;
  name: string;
  /** physical pixels */
  width: number;
  height: number;
  /** virtual desktop position */
  x: number;
  y: number;
  scaleFactor: number;
}

// â”€â”€ Space items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ApplicationItem {
  id: string;
  type: "application";
  name: string;
  path: string;
  args: string[];
  placement?: WindowPlacement;
}

export interface TerminalItem {
  id: string;
  type: "terminal";
  name: string;
  cwd: string;
  commands: string[];
  shell: "wt" | "powershell" | "cmd";
  placement?: WindowPlacement;
}

export interface UrlItem {
  id: string;
  type: "url";
  name: string;
  url: string;
  placement?: WindowPlacement;
}

export interface ScriptItem {
  id: string;
  type: "script";
  name: string;
  content: string;
  shell: "powershell" | "cmd";
  cwd: string;
  placement?: WindowPlacement;
}

export type SpaceItem = ApplicationItem | TerminalItem | UrlItem | ScriptItem;

export interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  items: SpaceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveredApp {
  name: string;
  path: string;
  iconBase64: string;
}

export const ITEM_TYPE_LABELS: Record<SpaceItemType, string> = {
  application: "Application",
  terminal: "Terminal",
  url: "URL",
  script: "Script",
};

export const SPACE_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
] as const;
