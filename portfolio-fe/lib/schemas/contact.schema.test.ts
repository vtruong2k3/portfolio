import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { contactSchema } from "./contact.schema";

/**
 * Property-based test cho `contactSchema` (Contact_Terminal validation).
 *
 * `contactSchema` cắt khoảng trắng đầu/cuối (`.trim()`) rồi áp dụng ràng buộc:
 * - `name`: độ dài sau khi cắt khoảng trắng trong [1, 120].
 * - `email`: đúng định dạng email.
 * - `message`: độ dài sau khi cắt khoảng trắng trong [1, 5000].
 *
 * Thuộc tính: mọi dữ liệu hợp lệ (tên đã cắt 1–120, email hợp lệ, nội dung đã
 * cắt 1–5000) đều vượt qua kiểm tra và được trả về ở dạng đã cắt khoảng trắng;
 * mọi dữ liệu vượt ngoài biên hoặc email sai định dạng đều bị từ chối.
 *
 * **Validates: Requirements 10.5**
 */
describe("contactSchema", () => {
  // Ký tự không phải khoảng trắng, dùng để dựng phần lõi có độ dài xác định
  // (độ dài lõi == độ dài sau khi cắt khoảng trắng).
  const nonWsChar = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-_".split(
      "",
    ),
  );
  const nonWsString = (minLength: number, maxLength: number) =>
    fc.array(nonWsChar, { minLength, maxLength }).map((cs) => cs.join(""));

  // Khoảng trắng tuỳ ý để bọc quanh lõi, kiểm chứng hành vi `.trim()`.
  const wsPad = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"), { maxLength: 4 })
    .map((cs) => cs.join(""));

  // Email hợp lệ dạng `local@domain.tld` với các thành phần chữ-số.
  const alnumChar = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyz0123456789".split(""),
  );
  const alnumString = (minLength: number, maxLength: number) =>
    fc.array(alnumChar, { minLength, maxLength }).map((cs) => cs.join(""));
  // TLD chỉ gồm chữ cái (zod từ chối chữ số trong TLD).
  const alphaChar = fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyz".split(""),
  );
  const alphaString = (minLength: number, maxLength: number) =>
    fc.array(alphaChar, { minLength, maxLength }).map((cs) => cs.join(""));
  const validEmail = fc
    .tuple(alnumString(1, 20), alnumString(1, 20), alphaString(2, 8))
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

  // --- Trường hợp HỢP LỆ: lõi đúng biên, có thể bọc khoảng trắng ---------------
  const validCase = fc
    .record({
      nameCore: nonWsString(1, 120),
      messageCore: nonWsString(1, 5000),
      email: validEmail,
      namePadL: wsPad,
      namePadR: wsPad,
      msgPadL: wsPad,
      msgPadR: wsPad,
      emailPadL: wsPad,
      emailPadR: wsPad,
    })
    .map((c) => ({
      shouldPass: true as const,
      nameCore: c.nameCore,
      messageCore: c.messageCore,
      email: c.email,
      input: {
        name: `${c.namePadL}${c.nameCore}${c.namePadR}`,
        message: `${c.msgPadL}${c.messageCore}${c.msgPadR}`,
        email: `${c.emailPadL}${c.email}${c.emailPadR}`,
      },
    }));

  // --- Trường hợp KHÔNG HỢP LỆ: phá đúng một ràng buộc, giữ các trường khác hợp lệ
  const invalidCase = fc
    .record({
      validName: nonWsString(1, 120),
      validMessage: nonWsString(1, 5000),
      email: validEmail,
      // Bộ phá vỡ: chọn một trường để làm sai.
      breaker: fc.oneof(
        // name rỗng sau khi cắt khoảng trắng (chỉ toàn khoảng trắng).
        fc
          .array(fc.constantFrom(" ", "\t", "\n"), { minLength: 0, maxLength: 6 })
          .map((cs) => ({ field: "name" as const, value: cs.join("") })),
        // name quá dài (> 120 sau khi cắt khoảng trắng).
        nonWsString(121, 200).map((s) => ({ field: "name" as const, value: s })),
        // message rỗng sau khi cắt khoảng trắng.
        fc
          .array(fc.constantFrom(" ", "\t", "\n"), { minLength: 0, maxLength: 6 })
          .map((cs) => ({ field: "message" as const, value: cs.join("") })),
        // message quá dài (> 5000 sau khi cắt khoảng trắng).
        nonWsString(5001, 5100).map((s) => ({
          field: "message" as const,
          value: s,
        })),
        // email sai định dạng (không có ký tự '@').
        nonWsString(1, 30).map((s) => ({ field: "email" as const, value: s })),
      ),
    })
    .map((c) => {
      const input = {
        name: c.validName,
        message: c.validMessage,
        email: c.email,
      } as Record<string, string>;
      input[c.breaker.field] = c.breaker.value;
      return { shouldPass: false as const, input };
    });

  // Feature: portfolio-3d-asset-suite, Property 22: Kiểm tra hợp lệ Contact theo contactSchema
  // Validates: Requirements 10.5
  it("Property 22: Kiểm tra hợp lệ Contact theo contactSchema", () => {
    fc.assert(
      fc.property(fc.oneof(validCase, invalidCase), (testCase) => {
        const result = contactSchema.safeParse(testCase.input);

        // Kết quả kiểm tra phải khớp với kỳ vọng (hợp lệ vs không hợp lệ).
        expect(result.success).toBe(testCase.shouldPass);

        if (testCase.shouldPass && result.success) {
          // Dữ liệu trả về đã được cắt khoảng trắng đúng theo lõi.
          expect(result.data.name).toBe(testCase.nameCore);
          expect(result.data.message).toBe(testCase.messageCore);
          expect(result.data.email).toBe(testCase.email);

          // Ràng buộc độ dài được đảm bảo trên dữ liệu đã cắt.
          expect(result.data.name.length).toBeGreaterThanOrEqual(1);
          expect(result.data.name.length).toBeLessThanOrEqual(120);
          expect(result.data.message.length).toBeGreaterThanOrEqual(1);
          expect(result.data.message.length).toBeLessThanOrEqual(5000);
        }
      }),
      { numRuns: 100 },
    );
  });
});
