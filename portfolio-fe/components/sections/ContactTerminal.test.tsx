/**
 * Hành vi và trường hợp biên cho `ContactTerminal`.
 *
 * `ContactTerminal` là lớp trình bày mỏng trên một form HTML thật dùng
 * react-hook-form + `zodResolver(contactSchema)`. Các bài test dưới đây tương
 * tác qua bàn phím/chuột như người dùng thực (`@testing-library/user-event`) và
 * chỉ kiểm chứng những hành vi quan sát được nối với Contact_Mutation qua prop:
 *
 * - Gửi không hợp lệ → chặn `onValidSubmit`, hiện lỗi từng trường, GIỮ dữ liệu
 *   đã nhập (Req 10.6).
 * - Gửi hợp lệ → gọi `onValidSubmit` với dữ liệu đã trim (Req 10.7).
 * - `isPending` → vô hiệu hóa nút gửi, ngăn gửi trùng lặp (Req 10.8).
 * - `isSuccess` → hiện dòng "Message sent successfully!" (Req 10.9).
 * - `errorMessage` → hiện thông báo lỗi và GIỮ dữ liệu đã nhập (Req 10.10).
 *
 * `reducedMotion` được truyền để con trỏ giữ tĩnh, giúp test tất định và không
 * phụ thuộc `requestAnimationFrame`.
 *
 * _Requirements: 10.6, 10.7, 10.8, 10.9, 10.10_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ContactTerminal } from "./ContactTerminal";

afterEach(() => {
  cleanup();
});

/**
 * Truy cập nhanh các trường nhập. Mỗi nhãn gồm prompt dạng dòng lệnh
 * (`aria-hidden`) + tên trường `sr-only`, nên truy vấn theo placeholder ổn định
 * và phản ánh đúng phần tử form mà người dùng tương tác.
 */
function getFields() {
  return {
    name: screen.getByPlaceholderText("your name") as HTMLInputElement,
    email: screen.getByPlaceholderText("you@example.com") as HTMLInputElement,
    message: screen.getByPlaceholderText(
      "type your message...",
    ) as HTMLTextAreaElement,
    submit: screen.getByRole("button", { name: /\.\/send/ }) as HTMLButtonElement,
  };
}

describe("ContactTerminal behavior and edge cases", () => {
  it("blocks onValidSubmit, shows per-field errors, and keeps entered data on invalid submit (Req 10.6)", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();

    render(<ContactTerminal onValidSubmit={onValidSubmit} reducedMotion />);

    const { name, email, message, submit } = getFields();

    // Email không hợp lệ; name/message để trống → toàn bộ trường thất bại.
    await user.type(email, "not-an-email");
    await user.click(submit);

    // Chặn gửi: callback không được gọi (Req 10.6).
    expect(onValidSubmit).not.toHaveBeenCalled();

    // Hiện lỗi mô tả cho từng trường không hợp lệ (role="alert").
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3);
    });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(message).toHaveAttribute("aria-invalid", "true");

    // Giữ lại dữ liệu người dùng đã nhập (Req 10.6).
    expect(email).toHaveValue("not-an-email");
  });

  it("calls onValidSubmit with trimmed data when all fields are valid (Req 10.7)", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();

    render(<ContactTerminal onValidSubmit={onValidSubmit} reducedMotion />);

    const { name, email, message, submit } = getFields();

    // Có khoảng trắng đầu/cuối để xác nhận dữ liệu được trim trước khi gọi.
    await user.type(name, "  Ada Lovelace  ");
    await user.type(email, "  ada@example.com  ");
    await user.type(message, "  Hello there!  ");
    await user.click(submit);

    await waitFor(() => {
      expect(onValidSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onValidSubmit).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello there!",
    });
  });

  it("disables the submit button while pending to prevent duplicate sends (Req 10.8)", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();

    render(
      <ContactTerminal onValidSubmit={onValidSubmit} isPending reducedMotion />,
    );

    const submit = screen.getByRole("button", {
      name: /\.\/send/,
    }) as HTMLButtonElement;

    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");

    // Click vào nút bị vô hiệu không kích hoạt gửi.
    await user.click(submit);
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("shows the success line when the mutation succeeds (Req 10.9)", () => {
    render(<ContactTerminal isSuccess reducedMotion />);

    const status = screen.getByText("Message sent successfully!");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("role", "status");
  });

  it("shows a descriptive error message and keeps entered data on mutation failure (Req 10.10)", async () => {
    const user = userEvent.setup();

    render(
      <ContactTerminal
        errorMessage="Something went wrong. Please try again."
        reducedMotion
      />,
    );

    const { name } = getFields();

    // Người dùng đã nhập dữ liệu trước khi mutation thất bại.
    await user.type(name, "Grace Hopper");

    // Thông báo lỗi mô tả được hiển thị (Req 10.10).
    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();

    // Dữ liệu đã nhập được giữ nguyên (Req 10.10).
    expect(name).toHaveValue("Grace Hopper");
  });
});
