import { describe, expect, it } from "vitest";
import { cn, formatBytes, getInitials } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("foo", false, "bar", null, undefined, "baz")).toBe("foo bar baz");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [1024 ** 2, "1 MB"],
    [1024 ** 5, "1048576 GB"],
  ])("%d → %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("getInitials", () => {
  it.each([
    ["Ada Lovelace", "AL"],
    ["  Grace   Brewster  Hopper ", "GH"],
    ["Cher", "CH"],
  ])("%s → %s", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
