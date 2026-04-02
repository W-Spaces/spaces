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
// Element.hasPointerCapture — used by Radix UI primitives (jsdom missing this)
Element.prototype.hasPointerCapture = function (_pointerId: number): boolean {
  return false;
};

// Element.scrollIntoView — used by Radix Select scroll (jsdom missing this)
Element.prototype.scrollIntoView = function (_options?: ScrollIntoViewOptions): void {
  // no-op polyfill
};

window.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;
