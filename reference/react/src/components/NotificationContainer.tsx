import React from "react";
import { useNotification, type NotificationType } from "@/hooks/useNotification";
import {
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  error: <XCircle className="h-3.5 w-3.5 text-rose-400" />,
  progress: <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />,
  info: <Info className="h-3.5 w-3.5 text-sky-400" />,
};

const accentMap: Record<NotificationType, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-rose-400",
  progress: "bg-sky-400",
  info: "bg-sky-400",
};

export function NotificationContainer() {
  const { notifications, dismiss } = useNotification();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-xs w-full pointer-events-none">
      <div className="space-y-1.5 pointer-events-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "relative flex gap-2.5 rounded-md px-3 py-2 text-xs",
              "bg-background/70 backdrop-blur-md",
              "border border-border/60",
              "shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
              "animate-in slide-in-from-right-3 fade-in duration-200"
            )}
          >
            {/* left accent */}
            <span
              className={cn(
                "absolute left-0 top-1 bottom-1 w-[2px] rounded-full",
                accentMap[n.type]
              )}
            />

            {/* icon */}
            <div className="mt-0.5">{iconMap[n.type]}</div>

            {/* content */}
            <div className="flex-1 min-w-0 leading-snug">
              <div className="font-medium truncate">{n.title}</div>
              {n.message && (
                <div className="opacity-70 line-clamp-2">
                  {n.message}
                </div>
              )}
            </div>

            {/* close */}
            <button
              onClick={() => dismiss(n.id)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
