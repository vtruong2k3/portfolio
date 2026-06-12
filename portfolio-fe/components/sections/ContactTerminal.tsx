"use client";

/**
 * Contact_Terminal — Form liên hệ kiểu terminal (HTML form).
 *
 * Component này là **lớp trình bày mỏng** trên một form HTML thật, dùng
 * react-hook-form + `zodResolver(contactSchema)` để kiểm tra hợp lệ (đã trim) và
 * tiêu thụ hàm thuần `cursorVisible` từ `lib/three/terminal.ts` cho con trỏ nhấp
 * nháy. Triển khai bằng DOM (không WebGL) để mọi trường nhập đều nhận được tiêu
 * điểm bàn phím và có nhãn gắn đúng cho trình đọc màn hình (Req 10.11, 10.12).
 *
 * Hành vi:
 * - Prompt kiểu dòng lệnh cho name/email/message + con trỏ nhấp nháy chu kỳ 1s
 *   (hiện 0,5s, ẩn 0,5s) qua `cursorVisible` (Req 10.2).
 * - Thẻ kính nền mờ, phông chữ monospace (Req 10.3).
 * - Phát sáng tiêu điểm chỉ áp lên đúng trường đang giữ tiêu điểm (Req 10.4).
 * - Submit validate bằng `contactSchema` đã trim: name 1–120, email hợp lệ,
 *   message 1–5000 (Req 10.5). Không hợp lệ → chặn gửi, hiện lỗi từng trường,
 *   giữ lại dữ liệu đã nhập (Req 10.6).
 * - Reduced_Motion_Mode → con trỏ tĩnh (luôn hiện) và tắt hiệu ứng nghiêng theo
 *   con trỏ (Req 10.13).
 *
 * Việc gọi Contact_Mutation, trạng thái đang xử lý, dòng thành công và thông báo
 * lỗi mutation được nối ở `ContactSection` (task 17.2) qua các prop bên dưới.
 *
 * _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.11, 10.13_
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactSchema } from "@/lib/schemas/contact.schema";
import { cursorVisible } from "@/lib/three/terminal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface ContactTerminalProps {
  /**
   * Gọi khi toàn bộ trường vượt qua kiểm tra hợp lệ bằng `contactSchema`
   * (dữ liệu đã được trim). Phía gọi (ContactSection) nối với Contact_Mutation
   * (Req 10.7).
   */
  onValidSubmit?: (data: ContactSchema) => void;
  /** Contact_Mutation đang chờ phản hồi → hiện trạng thái xử lý + vô hiệu nút (Req 10.8). */
  isPending?: boolean;
  /** Mutation thành công → hiện dòng "Message sent successfully!" (Req 10.9). */
  isSuccess?: boolean;
  /** Thông báo lỗi mô tả khi mutation thất bại; giữ lại dữ liệu đã nhập (Req 10.10). */
  errorMessage?: string | null;
  /**
   * Bật chế độ giảm chuyển động. Nếu không truyền, component tự đọc tùy chọn hệ
   * điều hành qua `usePrefersReducedMotion`.
   */
  reducedMotion?: boolean;
}

/** Chu kỳ nhấp nháy con trỏ: 1 giây (hiện 0,5s, ẩn 0,5s) (Req 10.2). */
const CURSOR_PERIOD_SEC = 1;
/** Góc nghiêng tối đa của thẻ theo con trỏ (deg) — tắt khi giảm chuyển động (Req 10.13). */
const MAX_TILT_DEG = 6;

/** Tên các trường để map prompt dòng lệnh. */
type FieldName = "name" | "email" | "message";

/** Prompt kiểu dòng lệnh cho từng trường. */
const PROMPTS: Record<FieldName, string> = {
  name: "guest@portfolio:~$ whoami",
  email: "guest@portfolio:~$ contact --email",
  message: "guest@portfolio:~$ cat message.txt",
};

/**
 * Hook con trỏ nhấp nháy: cập nhật trạng thái hiện/ẩn dựa trên hàm thuần
 * `cursorVisible`. Khi `reduced === true`, con trỏ giữ tĩnh (luôn hiện).
 *
 * Chỉ kích hoạt re-render khi giá trị thực sự đổi (≈2 lần/giây), nhờ React bail
 * out khi state không thay đổi.
 */
function useBlinkingCursor(reduced: boolean): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) {
      // Reduced_Motion_Mode: con trỏ tĩnh, luôn hiện (Req 10.13).
      setVisible(true);
      return;
    }

    let raf = 0;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = () => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsedSec = (now - start) / 1000;
      const next = cursorVisible(elapsedSec, CURSOR_PERIOD_SEC, false);
      setVisible((prev) => (prev === next ? prev : next));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return visible;
}

export function ContactTerminal({
  onValidSubmit,
  isPending = false,
  isSuccess = false,
  errorMessage = null,
  reducedMotion,
}: ContactTerminalProps) {
  const systemReducedMotion = usePrefersReducedMotion();
  const reduced = reducedMotion ?? systemReducedMotion;

  const cursorOn = useBlinkingCursor(reduced);

  // Trường đang giữ tiêu điểm — dùng để áp phát sáng CHỈ lên trường đó (Req 10.4).
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactSchema>({
    resolver: zodResolver(contactSchema),
    // Giữ lại dữ liệu người dùng đã nhập kể cả khi submit không hợp lệ (Req 10.6).
    shouldUnregister: false,
  });

  // handleSubmit chỉ gọi callback khi toàn bộ trường hợp lệ → tự động chặn gửi
  // khi không hợp lệ và hiển thị lỗi từng trường (Req 10.6).
  const onSubmit = useCallback(
    (data: ContactSchema) => {
      onValidSubmit?.(data);
    },
    [onValidSubmit],
  );

  // ── Hiệu ứng nghiêng thẻ theo con trỏ (tắt khi giảm chuyển động, Req 10.13) ──
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({
    rotateX: 0,
    rotateY: 0,
  });

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width; // 0..1
      const py = (event.clientY - rect.top) / rect.height; // 0..1
      // Map [0,1] → [-MAX_TILT_DEG, MAX_TILT_DEG]; trục X nghiêng ngược trục Y.
      setTilt({
        rotateX: (0.5 - py) * 2 * MAX_TILT_DEG,
        rotateY: (px - 0.5) * 2 * MAX_TILT_DEG,
      });
    },
    [reduced],
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  // Lớp viền/glow cho từng trường: chỉ trường đang focus mới có glow (Req 10.4).
  const fieldClass = (name: FieldName) => {
    const hasError = Boolean(errors[name]);
    const isFocused = focusedField === name;
    const base =
      "w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted/60 outline-none px-3 py-2 rounded-md border transition-all duration-200";
    const state = hasError
      ? "border-accent-strong/60"
      : isFocused
        ? "border-primary glow-cyan"
        : "border-border";
    return `${base} ${state}`;
  };

  const fieldProps = (name: FieldName) => ({
    onFocus: () => setFocusedField(name),
    onBlur: () => setFocusedField((cur) => (cur === name ? null : cur)),
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `contact-terminal-${name}-error` : undefined,
  });

  // Con trỏ nhấp nháy hiển thị (block ký tự); ẩn bằng opacity để giữ layout ổn định.
  const Cursor = (
    <span
      aria-hidden="true"
      className="inline-block w-[0.5ch] h-[1em] translate-y-[0.12em] bg-primary"
      style={{ opacity: cursorOn ? 1 : 0 }}
    />
  );

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="glass rounded-2xl border border-border overflow-hidden font-mono"
      style={{
        transform: reduced
          ? undefined
          : `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        transformStyle: reduced ? undefined : "preserve-3d",
        transition: "transform 200ms ease-out",
      }}
    >
      {/* Title bar kiểu cửa sổ terminal */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background/40">
        <span className="w-3 h-3 rounded-full bg-accent-strong/70" aria-hidden="true" />
        <span className="w-3 h-3 rounded-full bg-amber-400/70" aria-hidden="true" />
        <span className="w-3 h-3 rounded-full bg-green-400/70" aria-hidden="true" />
        <span className="ml-2 text-xs text-muted">contact — bash — 80×24</span>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Contact terminal form"
        className="flex flex-col gap-5 p-6 text-sm"
      >
        {/* ── Name ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-terminal-name" className="text-primary text-xs">
            <span aria-hidden="true">{PROMPTS.name}</span>
            <span className="sr-only">Name</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-green-400 select-none" aria-hidden="true">
              &gt;
            </span>
            <input
              id="contact-terminal-name"
              type="text"
              autoComplete="name"
              placeholder="your name"
              className={fieldClass("name")}
              {...fieldProps("name")}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p
              id="contact-terminal-name-error"
              role="alert"
              className="text-xs text-accent-strong"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        {/* ── Email ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-terminal-email" className="text-primary text-xs">
            <span aria-hidden="true">{PROMPTS.email}</span>
            <span className="sr-only">Email</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-green-400 select-none" aria-hidden="true">
              &gt;
            </span>
            <input
              id="contact-terminal-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={fieldClass("email")}
              {...fieldProps("email")}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p
              id="contact-terminal-email-error"
              role="alert"
              className="text-xs text-accent-strong"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* ── Message ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-terminal-message" className="text-primary text-xs">
            <span aria-hidden="true">{PROMPTS.message}</span>
            <span className="sr-only">Message</span>
          </label>
          <div className="flex items-start gap-2">
            <span className="text-green-400 select-none pt-2" aria-hidden="true">
              &gt;
            </span>
            <textarea
              id="contact-terminal-message"
              rows={5}
              placeholder="type your message..."
              className={`${fieldClass("message")} resize-none`}
              {...fieldProps("message")}
              {...register("message")}
            />
          </div>
          {errors.message && (
            <p
              id="contact-terminal-message-error"
              role="alert"
              className="text-xs text-accent-strong"
            >
              {errors.message.message}
            </p>
          )}
        </div>

        {/* ── Submit + con trỏ nhấp nháy ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted flex items-center gap-1" aria-hidden="true">
            <span className="text-primary">guest@portfolio:~$</span>
            {Cursor}
          </span>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="px-5 py-2.5 rounded-md border border-primary/60 bg-primary/10 text-primary text-sm font-mono hover:bg-primary/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 glow-cyan"
          >
            {isPending ? "./send --wait" : "./send"}
          </button>
        </div>

        {/* ── Dòng kết quả: thành công / lỗi ─────────────────────────────── */}
        {isSuccess && (
          <p role="status" className="text-xs text-green-400 font-mono">
            Message sent successfully!
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="text-xs text-accent-strong font-mono">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}

export default ContactTerminal;
