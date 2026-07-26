import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopBar />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1600px] px-6 py-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
