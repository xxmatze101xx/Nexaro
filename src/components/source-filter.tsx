"use client";

import { cn } from "@/lib/utils";
import {
    Mail, Hash, CalendarDays, MailOpen, Users, ShieldCheck, Inbox,
    type LucideIcon,
} from "lucide-react";

const SOURCE_CONFIG: Record<string, { Icon: LucideIcon; label: string; color: string }> = {
    gmail:   { Icon: Mail,         label: "Gmail",    color: "text-red-500"    },
    slack:   { Icon: Hash,         label: "Slack",    color: "text-purple-500" },
    gcal:    { Icon: CalendarDays, label: "Calendar", color: "text-blue-500"   },
    outlook: { Icon: MailOpen,     label: "Outlook",  color: "text-sky-500"    },
    teams:   { Icon: Users,        label: "Teams",    color: "text-indigo-500" },
    proton:  { Icon: ShieldCheck,  label: "Proton",   color: "text-violet-500" },
    apple:   { Icon: Inbox,        label: "Apple",    color: "text-gray-500"   },
};

const FALLBACK: { Icon: LucideIcon; label: string; color: string } = {
    Icon: Mail, label: "Mail", color: "text-gray-400",
};

interface SourceIconProps {
    source: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function SourceIcon({ source, size = "md", className }: SourceIconProps) {
    const config = SOURCE_CONFIG[source] ?? { ...FALLBACK, label: source };
    const { Icon, color } = config;

    const containerSize = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" }[size];
    const iconSize = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" }[size];

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-lg bg-muted",
                containerSize,
                className
            )}
            title={config.label}
        >
            <Icon className={cn(iconSize, color)} strokeWidth={1.75} />
        </div>
    );
}

export { SOURCE_CONFIG };
