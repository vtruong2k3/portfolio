/**
 * Đăng ký kiểu cho matcher `toHaveNoViolations` của `vitest-axe` với Vitest 4.
 *
 * `vitest-axe@0.1.0` chỉ augment namespace `Vi.Assertion` (kiểu cũ). Vitest 4
 * lấy kiểu matcher từ interface `Assertion`/`AsymmetricMatchersContaining` của
 * module `vitest`, nên ta augment trực tiếp ở đó để `expect(...).toHaveNoViolations()`
 * có kiểu hợp lệ trong `tsc`.
 */
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
