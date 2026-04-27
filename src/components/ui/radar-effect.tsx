"use client";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import React from "react";

interface CircleProps {
  className?: string;
  children?: React.ReactNode;
  idx: number;
  style?: React.CSSProperties;
}

export const Circle = ({ className, children, idx, style }: CircleProps) => {
  return (
    <motion.div
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: idx * 0.1, duration: 0.2 }}
      className={twMerge(
        "absolute inset-0 left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 transform rounded-full border border-neutral-200",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const Radar = ({ className }: { className?: string }) => {
  const circles = new Array(8).fill(1);
  return (
    <div
      className={twMerge(
        "relative flex h-20 w-20 items-center justify-center rounded-full",
        className
      )}
    >
      <style>{`
        @keyframes radar-bounce {
          from { transform: rotate(-10deg); }
          to   { transform: rotate(-170deg); }
        }
        .animate-radar-bounce {
          animation: radar-bounce 4s ease-in-out infinite alternate;
        }
      `}</style>
      {/* Sweep line – bounces across the visible lower semicircle */}
      <div
        style={{ transformOrigin: "right center" }}
        className="animate-radar-bounce absolute right-1/2 top-1/2 z-[2] flex h-[5px] w-[400px] items-end justify-center overflow-hidden bg-transparent"
      >
        <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
      </div>
      {/* Concentric circles */}
      {circles.map((_, idx) => (
        <Circle
          style={{
            height: `${(idx + 1) * 5}rem`,
            width: `${(idx + 1) * 5}rem`,
            border: `1px solid rgba(71, 85, 105, ${1 - (idx + 1) * 0.1})`,
          }}
          key={`circle-${idx}`}
          idx={idx}
        />
      ))}
    </div>
  );
};

export const IconContainer = ({
  icon,
  text,
  delay,
}: {
  icon?: React.ReactNode;
  text?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: delay ?? 0 }}
      className="relative z-[3] flex flex-col items-center justify-center space-y-2"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        {icon}
      </div>
      <div className="hidden rounded-md px-2 py-1 md:block">
        <div className="text-center text-xs font-medium text-slate-500">
          {text}
        </div>
      </div>
    </motion.div>
  );
};
