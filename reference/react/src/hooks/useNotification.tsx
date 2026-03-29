import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type NotificationType = "info" | "success" | "warning" | "error" | "progress";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  progress?: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  showInfo: (title: string, message?: string, duration?: number) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showProgress: (title: string, progress: number, message?: string) => string;
  updateProgress: (id: string, progress: number, message?: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX_NOTIFICATIONS = 5;
const DEFAULT_DURATION = 5000;

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">): string => {
      const id = generateId();
      const newNotification = { ...notification, id };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Keep only the latest MAX_NOTIFICATIONS
        return updated.slice(0, MAX_NOTIFICATIONS);
      });

      // Auto-dismiss after duration (except for progress type)
      if (notification.type !== "progress" && notification.duration !== 0) {
        const duration = notification.duration ?? DEFAULT_DURATION;
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [generateId, dismiss]
  );

  const showInfo = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addNotification({ type: "info", title, message, duration });
    },
    [addNotification]
  );

  const showSuccess = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addNotification({ type: "success", title, message, duration });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addNotification({ type: "warning", title, message, duration });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message?: string, duration?: number) => {
      return addNotification({ type: "error", title, message, duration: duration ?? 7000 });
    },
    [addNotification]
  );

  const showProgress = useCallback(
    (title: string, progress: number, message?: string) => {
      return addNotification({ type: "progress", title, message, progress, duration: 0 });
    },
    [addNotification]
  );

  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, progress, ...(message && { message }) } : n))
    );
  }, []);

  const value: NotificationContextValue = {
    notifications,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showProgress,
    updateProgress,
    dismiss,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
