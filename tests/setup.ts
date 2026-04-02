import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri APIs used across components
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

// Mock Tauri dialog plugin
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}));

// ── jsdom polyfills ──────────────────────────────────────────────────────────

// ResizeObserver is used by MonitorLayout and Radix ScrollArea
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

// IntersectionObserver is sometimes needed
class IntersectionObserverMock {
  constructor() {
    this.callback = null;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  callback: ((entries: unknown[]) => void) | null;
}
window.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;
