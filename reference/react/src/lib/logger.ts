/**
 * Lightweight logging wrapper around console.*
 * Provides structured logging with timestamps and file context
 * Can be extended later to send logs to backend, add trace IDs, etc.
 */

import { config } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
};

const getCallerInfo = (): string => {
  try {
    const stack = new Error().stack?.split("\n")[3]; // Get caller's stack frame
    const match = stack?.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, , file, line] = match;
      const filename = file?.split("/").pop() || "";
      return `${filename}:${line}`;
    }
    return "";
  } catch {
    return "";
  }
};

const formatMessage = (level: string, message: string, meta?: any): any[] => {
  const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] || "00:00:00"; // HH:MM:SS
  const caller = getCallerInfo();
  const prefix = `[${timestamp}]${caller ? ` [${caller}]` : ""} ${level.toUpperCase()}:`;

  return meta && Object.keys(meta).length > 0 ? [prefix, message, meta] : [prefix, message];
};

export const logger = {
  debug: (message: string, meta?: any) => {
    if (shouldLog("debug")) {
      console.log(...formatMessage("debug", message, meta));
    }
  },

  info: (message: string, meta?: any) => {
    if (shouldLog("info")) {
      console.log(...formatMessage("info", message, meta));
    }
  },

  warn: (message: string, meta?: any) => {
    if (shouldLog("warn")) {
      console.warn(...formatMessage("warn", message, meta));
    }
  },

  error: (message: string, meta?: any) => {
    if (shouldLog("error")) {
      console.error(...formatMessage("error", message, meta));
    }
  },
};

// TODO Phase 2: Add remote logging transport, trace IDs, structured logging to backend endpoint
