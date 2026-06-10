"use client";

import React, { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema } from "@/lib/schemas/contact.schema";
import type { z } from "zod";
import { useSendContact } from "@/hooks/mutations/use-contact";
import { GlassCard } from "@/components/ui/GlassCard";

type ContactFormData = z.infer<typeof contactSchema>;

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
    color: "hover:text-foreground hover:border-foreground/30",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: "hover:text-blue-400 hover:border-blue-400/30",
  },
  {
    label: "Email",
    href: "mailto:dev@example.com",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "hover:text-primary hover:border-primary/30",
  },
];

function RevealWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return <div ref={ref} className="reveal">{children}</div>;
}

function InputField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} <span className="text-accent text-xs" aria-hidden="true">*</span>
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-accent-strong flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactSection() {
  const { mutate: sendContact, isPending } = useSendContact();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    sendContact(data, {
      onSuccess: () => {
        toast.success("Message sent! I'll get back to you soon. 🚀");
        reset();
      },
      onError: (err) => {
        toast.error(err.message || "Something went wrong. Please try again.");
      },
    });
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl glass border border-border text-foreground text-sm placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all duration-200";
  const inputErrorClass = "border-accent-strong/50 focus:border-accent-strong focus:ring-accent-strong/30";

  return (
    <section id="contact" className="py-24 relative" aria-label="Contact section">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <RevealWrapper>
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Let&apos;s Talk</span>
            <h2 className="text-4xl md:text-5xl font-bold">
              Get In <span className="gradient-text">Touch</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-4" />
            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
              Have a project in mind or just want to say hi? I&apos;d love to hear from you.
              Fill out the form or reach me through social media.
            </p>
          </div>
        </RevealWrapper>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Contact form */}
          <RevealWrapper delay={100}>
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6 text-foreground">Send a Message</h3>

              {/* Contact form (Req 12.1) */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                aria-label="Contact form"
                className="flex flex-col gap-5"
              >
                {/* Name */}
                <InputField
                  id="contact-name"
                  label="Name"
                  error={errors.name?.message}
                >
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    aria-required="true"
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    aria-invalid={!!errors.name}
                    className={`${inputClass} ${errors.name ? inputErrorClass : ""}`}
                    {...register("name")}
                  />
                </InputField>

                {/* Email (Req 12.4 — invalid email format validation) */}
                <InputField
                  id="contact-email"
                  label="Email"
                  error={errors.email?.message}
                >
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    aria-required="true"
                    aria-describedby={errors.email ? "contact-email-error" : undefined}
                    aria-invalid={!!errors.email}
                    className={`${inputClass} ${errors.email ? inputErrorClass : ""}`}
                    {...register("email")}
                  />
                </InputField>

                {/* Message (Req 12.5 — required fields) */}
                <InputField
                  id="contact-message"
                  label="Message"
                  error={errors.message?.message}
                >
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Tell me about your project..."
                    aria-required="true"
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    aria-invalid={!!errors.message}
                    className={`${inputClass} resize-none ${errors.message ? inputErrorClass : ""}`}
                    {...register("message")}
                  />
                </InputField>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending}
                  aria-busy={isPending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong text-background font-semibold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 glow-cyan flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </GlassCard>
          </RevealWrapper>

          {/* Right: Info + social links */}
          <RevealWrapper delay={200}>
            <div className="flex flex-col gap-8">
              {/* Quick info cards */}
              <div className="grid gap-4">
                {[
                  {
                    icon: "📧",
                    label: "Email",
                    value: "dev@example.com",
                    href: "mailto:dev@example.com",
                  },
                  {
                    icon: "📍",
                    label: "Location",
                    value: "Vietnam (Remote worldwide)",
                    href: null,
                  },
                  {
                    icon: "🕐",
                    label: "Response time",
                    value: "Usually within 24 hours",
                    href: null,
                  },
                ].map((item) => (
                  <GlassCard key={item.label} className="p-4 flex items-center gap-4">
                    <span className="text-2xl w-10 text-center" aria-hidden="true">{item.icon}</span>
                    <div>
                      <p className="text-xs text-muted font-medium uppercase tracking-wide">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Social links (Req 12.2) */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Find me on</h4>
                <div className="flex gap-3" role="list" aria-label="Social media links">
                  {SOCIAL_LINKS.map((social) => (
                    <div key={social.label} role="listitem">
                      <a
                        href={social.href}
                        target={social.href.startsWith("mailto") ? undefined : "_blank"}
                        rel={social.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                        aria-label={social.label}
                        className={`flex items-center justify-center w-12 h-12 glass rounded-xl border border-border text-muted transition-all duration-300 ${social.color}`}
                      >
                        {social.icon}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability badge */}
              <GlassCard className="p-5 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Available for projects</p>
                    <p className="text-xs text-muted mt-0.5">Open to full-time roles & freelance contracts</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
