import { config } from './config'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function log(level: LogLevel, message: string, meta?: object) {
  if (LEVELS[level] < LEVELS[config.logging.level]) return
  const time = new Date().toTimeString().slice(0, 8)
  console[level](`[${time}] ${level.toUpperCase()}: ${message}`, meta ?? '')
}

export const logger = {
  debug: (msg: string, meta?: object) => log('debug', msg, meta),
  info:  (msg: string, meta?: object) => log('info',  msg, meta),
  warn:  (msg: string, meta?: object) => log('warn',  msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
}
