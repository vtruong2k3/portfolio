/**
 * Accessibility tests cho `ContactTerminal`.
 *
 * `ContactTerminal` là tài sản chứa nội dung tương tác (form liên hệ), nên mỗi
 * trường nhập PHẢI là phần tử form có thể nhận tiêu điểm bàn phím qua phím Tab,
 * có nhãn/tên truy cập (accessible name) không rỗng tương ứng chức năng cho
 * trình đọc màn hình, và toàn bộ form phải hoàn tất + gửi được CHỈ bằng bàn phím
 * (Req 10.11, 10.12, 12.3).
 *
 * Mỗi nhãn gồm prompt dạng dòng lệnh (`aria-hidden`) + tên trường `sr-only`,
 * nên tên truy cập hiệu dụng của từng trường là "Name", "Email", "Message" —
 * các phần tử `aria-hidden` bị loại khỏi phép tính tên truy cập.
 *
 * Ba nhóm kiểm tra:
 *   1. Tên truy cập + tiêu điểm: mỗi trường truy vấn được theo `role=textbox`
 *      với tên không rỗng và nhận được tiêu điểm bàn phím (Req 10.11, 12.3).
 *   2. Hoàn tất bằng bàn phím: dùng `user-event` Tab qua từng trường, gõ dữ liệu
 *      hợp lệ, Tab tới nút gửi và kích hoạt bằng Enter → `onValidSubmit` được
 *      gọi với dữ liệu đã trim, không cần dùng chuột (Req 10.12).
 *   3. Không vi phạm tiếp cận: cây render không vi phạm quy tắc `vitest-axe`.
 *
 * `reducedMotion` được truyền để con trỏ giữ tĩnh, giúp test tất định và không
 * phụ thuộc `requestAnimationFrame`.
 *
 * _Requirements: 10.11, 10.12, 12.3_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime (giống ExperienceTimeline.a11y.test.tsx).
expect.extend(axeMatchers);

import { ContactTerminal } from "./ContactTerminal";

afterEach(() => {
  cleanup();
});

describe("ContactTerminal accessibility", () => {
  it("exposes each input as a focusable form element with a non-empty accessible name (Req 10.11, 12.3)", () => {
    render(<ContactTerminal reducedMotion />);

    // Tên truy cập hiệu dụng = phần sr-only của nhãn (prompt aria-hidden bị bỏ).
    const name = screen.getByRole("textbox", { name: "Name" });
    const email = screen.getByRole("textbox", { name: "Email" });
    const message = screen.getByRole("textbox", { name: "Message" });

    // Mỗi trường nhận được tiêu điểm bàn phím (không bị tabindex=-1 / disabled).
    for (const field of [name, email, message]) {
      field.focus();
      expect(field).toHaveFocus();
    }
  });

  it("allows completing and submitting the form using the keyboard only (Req 10.12)", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();

    render(<ContactTerminal onValidSubmit={onValidSubmit} reducedMotion />);

    const name = screen.getByRole("textbox", { name: "Name" });
    const email = screen.getByRole("textbox", { name: "Email" });
    const message = screen.getByRole("textbox", { name: "Message" });
    const submit = screen.getByRole("button", { name: /\.\/send/ });

    // Tab vào trường đầu tiên có thể nhận tiêu điểm — phải là trường Name.
    await user.tab();
    expect(name).toHaveFocus();
    await user.keyboard("Ada Lovelace");

    // Tab sang Email và gõ.
    await user.tab();
    expect(email).toHaveFocus();
    await user.keyboard("ada@example.com");

    // Tab sang Message và gõ.
    await user.tab();
    expect(message).toHaveFocus();
    await user.keyboard("Hello there!");

    // Tab tới nút gửi và kích hoạt bằng bàn phím (không dùng chuột).
    await user.tab();
    expect(submit).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onValidSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onValidSubmit).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello there!",
    });
  });

  it("reports no accessibility violations (vitest-axe)", async () => {
    const { container } = render(<ContactTerminal reducedMotion />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations while pending, success, and error states are shown (vitest-axe)", async () => {
    const { container } = render(
      <ContactTerminal
        isPending
        isSuccess
        errorMessage="Something went wrong. Please try again."
        reducedMotion
      />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
