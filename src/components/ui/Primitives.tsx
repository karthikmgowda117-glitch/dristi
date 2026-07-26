import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";

/** Solid card — used for dense/tabular data per DESIGN_SYSTEM.md §5 */
export function Card({
  className, children, aiDerived = false, onOpenTrace,
}: {
  className?: string; children: React.ReactNode; aiDerived?: boolean; onOpenTrace?: () => void;
}) {
  return (
    <div
      className={clsx(
        "surface-card rounded-xl2 p-4",
        aiDerived && "trace-seam",
        className
      )}
    >
      {aiDerived && (
        <button
          onClick={onOpenTrace}
          aria-label="View explainability trace"
          className="absolute -mt-1 -ml-1 opacity-0"
        />
      )}
      {children}
    </div>
  );
}

/** Floating glass surface — overlays, panels, query bar, modals only */
export function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("glass-panel rounded-xl2", className)}>{children}</div>;
}

export function Button({
  variant = "primary",
  size = "md",
  destructive,
  requireConfirm,
  className,
  children,
  onClick,
  disabled,
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  destructive?: boolean;
  requireConfirm?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  const [confirming, setConfirming] = React.useState(false);

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const sizes = size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2.5";
  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primary-700 shadow-card hover:shadow-elevated hover:-translate-y-px active:translate-y-0",
    secondary: "bg-white text-ink border border-line hover:border-primary/40 hover:-translate-y-px",
    ghost: "text-muted hover:text-ink hover:bg-black/[0.03]",
  };
  const destructiveClass = destructive ? "!bg-danger hover:!bg-red-600 !text-white" : "";

  function handleClick() {
    if (destructive && requireConfirm && !confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    onClick?.();
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={clsx(base, sizes, variants[variant], destructiveClass, className)}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {confirming ? "Click again to confirm" : children}
    </motion.button>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "gold" | "accent" | "info" | "primary";
  className?: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-black/[0.04] text-muted border-line",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    gold: "bg-ksp-gold/10 text-ksp-gold border-ksp-gold/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    info: "bg-primary/10 text-primary border-primary/20",
    primary: "bg-primary text-white border-primary",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone] || tones.neutral, className)}>
      {children}
    </span>
  );
}

/** Fixed, non-dismissible provenance pill — SEED / SYNTHETIC / NLP_EXTRACTED. Per doc 07/14: never optional. */
export function ProvenanceTag({ kind }: { kind: "SEED" | "SYNTHETIC" | "NLP_EXTRACTED" }) {
  const label = kind === "NLP_EXTRACTED" ? "AI-extracted" : kind === "SEED" ? "Seed data" : "Synthetic data";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning/90">
      <GitBranch size={11} /> {label}
    </span>
  );
}

/** The trace glyph — small branching icon, reserved exclusively for explainability affordances */
export function TraceGlyph({ onClick, label = "View source & confidence" }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent transition hover:bg-accent/20 hover:shadow-trace animate-trace-pulse"
    >
      <GitBranch size={13} />
    </button>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value < 0.5 ? "text-muted" : value < 0.8 ? "text-primary" : "text-accent";
  const barTone = value < 0.5 ? "bg-muted/50" : value < 0.8 ? "bg-primary" : "bg-accent";
  const label = value < 0.5 ? "Low confidence" : value < 0.8 ? "Confidence" : "High confidence";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={clsx("h-full rounded-full", barTone)}
        />
      </div>
      <span className={clsx("text-xs font-medium tabular-nums", tone)}>{pct}% · {label}</span>
    </div>
  );
}

export function AlertBanner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "critical";
  title: string;
  children?: React.ReactNode;
}) {
  const map = {
    info: { border: "border-primary/25", bg: "bg-primary/5", text: "text-primary", icon: "ℹ" },
    warning: { border: "border-warning/30", bg: "bg-warning/8", text: "text-warning", icon: "⚠" },
    critical: { border: "border-ksp-maroon/30", bg: "bg-ksp-maroon/5", text: "text-ksp-maroon", icon: "⛔" },
  }[tone];
  return (
    <div className={clsx("flex gap-3 rounded-xl2 border p-4", map.border, map.bg)}>
      <span className={clsx("mt-0.5 text-base", map.text)}>{map.icon}</span>
      <div>
        <p className={clsx("text-sm font-semibold", map.text)}>{title}</p>
        {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      </div>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("skeleton animate-shimmer rounded-lg", className)} />;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-line bg-black/[0.015] py-14 text-center">
      {icon && <div className="text-muted/60">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted">{hint}</p>}
      {action}
    </div>
  );
}
