import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, "aria-invalid": ariaInvalid, ...props }, ref) {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";
    return (
      <input
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
