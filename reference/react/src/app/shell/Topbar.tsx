import { useAuth } from "@/app/providers/AuthProvider";
import { useNotification } from "@/hooks/useNotification";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Bell, X, CheckCircle, Info, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/hooks/useNotification";
import { useNavigate, useLocation } from "react-router-dom";

interface TopbarProps {
  setMobileOpen: (open: boolean) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  const iconClass = "h-5 w-5 flex-shrink-0";
  switch (type) {
    case "success":
      return <CheckCircle className={cn(iconClass, "text-emerald-500")} />;
    case "warning":
      return <AlertTriangle className={cn(iconClass, "text-amber-500")} />;
    case "error":
      return <XCircle className={cn(iconClass, "text-rose-500")} />;
    default:
      return <Info className={cn(iconClass, "text-sky-500")} />;
  }
};

const getNotificationBgClass = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-600 text-emerald-950 dark:text-emerald-50";
    case "warning":
      return "bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-600 text-amber-950 dark:text-amber-50";
    case "error":
      return "bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-600 text-rose-950 dark:text-rose-50";
    default:
      return "bg-sky-50 dark:bg-sky-950/30 border-l-4 border-sky-600 text-sky-950 dark:text-sky-50";
  }
};

export function Topbar({ setMobileOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const { notifications, dismiss } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout({ redirect: "/login" });
    logger.info("User logged out via topbar");
  };

  const clearAll = () => {
    notifications.forEach(notif => dismiss(notif.id));
  };

  // Show back button on sub-routes (more than 2 path segments)
  // Examples: /admin/users/new, /admin/users/import, /goal-progress/123, /child-profile/new
  // But NOT on: /admin/users, /goal-progress, /dashboard
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const showBackButton = pathSegments.length > 2;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {/* Back button - temporarily commented out */}
          {/* {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )} */}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <RoleSwitcher />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="sticky top-0 bg-background z-10 border-b">
                <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-semibold">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-muted" onClick={clearAll}>
                      Clear all
                    </Button>
                  )}
                </DropdownMenuLabel>
              </div>
              <div className="max-h-[32rem] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Bell className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                    <p className="mt-1 text-xs text-muted-foreground">No notifications at the moment</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "relative flex items-start gap-3 p-4 transition-colors hover:bg-muted/50",
                          getNotificationBgClass(notif.type)
                        )}
                      >
                        <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-semibold leading-tight">{notif.title}</p>
                          {notif.message && (
                            <p className="text-xs opacity-80 leading-relaxed">{notif.message}</p>
                          )}
                          {notif.progress !== undefined && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs opacity-70">Progress</span>
                                <span className="text-xs font-medium">{notif.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300" 
                                  style={{ width: `${notif.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 hover:bg-background/80 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(notif.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted">{user.displayName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    {user.role.replace("_", " ")}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
