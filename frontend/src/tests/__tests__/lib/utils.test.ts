import { describe, it, expect } from "vitest";
import { cn, formatBytes } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should join class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should filter falsy values", () => {
      expect(cn("foo", false, "bar", null, "baz")).toBe("foo bar baz");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });
  });
});
