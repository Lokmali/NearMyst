import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-[var(--radius-btn)] border bg-subtle px-3 py-2.5 text-body text-primary outline-none transition-[border-color,box-shadow] duration-fast",
        "placeholder:text-muted",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-danger/60" : "border-border",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(function Select({ className, children, error, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-11 w-full cursor-pointer rounded-[var(--radius-btn)] border bg-subtle px-3 py-2.5 text-body text-primary outline-none transition-[border-color,box-shadow] duration-fast",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
        error ? "border-danger/60" : "border-border",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[6.5rem] w-full resize-y rounded-[var(--radius-md)] border bg-subtle px-3.5 py-3 text-body leading-relaxed text-primary outline-none transition-[border-color,box-shadow] duration-fast",
        "placeholder:text-muted",
        "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-danger/60" : "border-border",
        className,
      )}
      {...props}
    />
  );
});

export function FieldHint({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p className={cn("mt-1.5 text-caption", error ? "text-danger" : "text-muted")}>
      {children}
    </p>
  );
}
