import * as React from "react";
import { cn } from "@/lib/ui/cn";

export type BadgeVariant =
  | "default"
  | "muted"
  | "success"
  | "warning"
  | "destructive"
  | "navy"
  | "purple"
  | "sky"
  | "lime";

const base =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const variants: Record<BadgeVariant, string> = {
  default: "bg-card text-foreground border-border",
  muted: "bg-muted text-muted-foreground border-transparent",
  success: "bg-primary/15 text-foreground border-primary/40",
  warning: "bg-warning/15 text-foreground border-warning/50",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  navy: "bg-support-navy text-white border-transparent",
  purple: "bg-support-purple/20 text-support-navy border-support-purple/40",
  sky: "bg-support-sky/20 text-support-navy border-support-sky/40",
  lime: "bg-support-lime/40 text-support-navy border-support-lime",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
