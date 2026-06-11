import { describe, expect, it } from "vitest";

import { PALETTE } from "./palette";

/**
 * Unit test cho bảng màu chủ đạo của cảnh 3D Hero.
 *
 * _Requirements: 1.3_
 */
describe("PALETTE", () => {
  it("chứa đúng 4 mã màu", () => {
    expect(Object.keys(PALETTE)).toHaveLength(4);
  });

  it("có đúng các khóa màu cyan, violet, blue, pink", () => {
    expect(Object.keys(PALETTE).sort()).toEqual(
      ["blue", "cyan", "pink", "violet"].sort(),
    );
  });

  it("ánh xạ mỗi khóa tới đúng giá trị hex", () => {
    expect(PALETTE).toEqual({
      cyan: "#22d3ee",
      violet: "#a855f7",
      blue: "#3b82f6",
      pink: "#ec4899",
    });
  });

  it.each([
    ["cyan", "#22d3ee"],
    ["violet", "#a855f7"],
    ["blue", "#3b82f6"],
    ["pink", "#ec4899"],
  ] as const)("khóa %s có giá trị %s", (key, hex) => {
    expect(PALETTE[key]).toBe(hex);
  });
});
