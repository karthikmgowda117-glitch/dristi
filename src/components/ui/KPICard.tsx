import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export function KPICard({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number;
  delta?: string;
  tone?: "neutral" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = { current: 0 };
    const duration = 700;
    const start = performance.now();
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      controls.current = Math.round(eased * value);
      setDisplay(controls.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const toneClass = {
    neutral: "text-ink",
    warning: "text-warning",
    danger: "text-danger",
    success: "text-success",
  }[tone];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="surface-card rounded-xl2 p-4"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-muted/60">{icon}</span>}
      </div>
      <p className={clsx("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>{display.toLocaleString()}</p>
      {delta && <p className="mt-1 text-xs text-muted">{delta}</p>}
    </motion.div>
  );
}
