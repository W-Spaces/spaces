import { describe, it, expect } from "vitest";
import { cn } from "./utils";

// vitest.config.ts sets up @testing-library/jest-dom matchers
import "@testing-library/jest-dom";

describe("cn()", () => {
  it("merges tailwind classes with clsx", () => {
    const result = cn("text-red-500 bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("handles false conditions gracefully", () => {
    const isActive = false;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    const result = cn("text-red-500 text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles null and undefined as conditional values", () => {
    const result = cn("base", null, undefined, false, "final");
    expect(result).toBe("base final");
  });

  it("handles array inputs", () => {
    const result = cn(["class1", "class2"], "class3");
    expect(result).toBe("class1 class2 class3");
  });

  it("handles mixed input types", () => {
    const result = cn("text-red-500", ["p-4", "m-2"], false, {
      "font-bold": true,
    });
    expect(result).toContain("text-red-500");
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
    expect(result).toContain("font-bold");
  });
});
