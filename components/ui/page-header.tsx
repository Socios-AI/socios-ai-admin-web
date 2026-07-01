import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  divider?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  divider = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6",
        divider && "border-b border-border pb-4",
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
          {breadcrumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
