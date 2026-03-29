import { config } from "./config";
import { logger } from "./logger";

/**
 * Get the access token from session storage
 */
function getAccessToken(): string | null {
  try {
    const sessionData = sessionStorage.getItem(config.sessionKey);
    if (!sessionData) return null;
    const session = JSON.parse(sessionData);
    return session?.accessToken ?? null;
  } catch (error) {
    logger.error("Failed to get access token from session", { error });
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface StreamLogEvent {
  type: "log";
  ts: string;
  message: string;
  stage?: string;
  meta?: Record<string, unknown>;
}

interface StreamResultEvent<T = unknown> {
  type: "result";
  ts: string;
  data: T;
}

interface StreamErrorEvent {
  type: "error";
  ts: string;
  message: string;
  details?: unknown;
}

type StreamEvent<T = unknown> = StreamLogEvent | StreamResultEvent<T> | StreamErrorEvent;

interface ApiLongRequestOptions extends ApiRequestOptions {
  timeout?: number;
  onLog?: (event: StreamLogEvent) => void;
}

function buildUrl(path: string): string {
  // Allow absolute URLs for flexibility while preferring config.api.baseUrl
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return config.api.resolveUrl(path);
}

function createRequestInit(options: ApiRequestOptions): RequestInit {
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  // Use provided token, or fall back to session storage
  const token = options.token !== undefined ? options.token : getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.api.timeout);
  const init = createRequestInit({ ...options, signal: controller.signal });

  try {
    const response = await fetch(buildUrl(path), init);

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const message = (data as any)?.message ?? response.statusText ?? "Request failed";
      logger.error("API request failed", { path, status: response.status, message, data });
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    if (error.name === "AbortError") {
      logger.error("API request timed out", { path });
      throw new ApiError("Request timed out", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiLongRequest<T>(
  path: string,
  options: ApiLongRequestOptions = {}
): Promise<T> {
  const timeoutMs = options.timeout ?? 300000; // 5 minutes default
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const init = createRequestInit({ ...options, signal: controller.signal });

  try {
    const response = await fetch(buildUrl(path), init);

    if (!response.ok) {
      const message = response.statusText ?? "Request failed";
      logger.error("API long request failed", { path, status: response.status, message });
      throw new ApiError(message, response.status);
    }

    if (!response.body) {
      throw new ApiError("Response body is empty", 500);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by newline (NDJSON)
      let lineIndex;
      while ((lineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, lineIndex).trim();
        buffer = buffer.slice(lineIndex + 1);

        if (!line) continue;

        try {
          const receivedEvent = JSON.parse(line) as StreamEvent<T>;

          console.log(receivedEvent);

          if (receivedEvent.type === "log") {
            const logEvent = receivedEvent as StreamLogEvent;
            if (options.onLog) {
              options.onLog(logEvent);
            } else {
              logger.info(logEvent.message, { stage: logEvent.stage, meta: logEvent.meta });
            }
          } else if (receivedEvent.type === "result") {
            const resultEvent = receivedEvent as StreamResultEvent<T>;
            logger.info("Stream completed with result", { path });
            return resultEvent.data;
          } else if (receivedEvent.type === "error") {
            const errorEvent = receivedEvent as StreamErrorEvent;
            logger.error("Stream error", { path, message: errorEvent.message, details: errorEvent.details });
            throw new ApiError(errorEvent.message, 500, errorEvent.details);
          }
        } catch (parseError) {
          logger.error("Failed to parse stream line", { path, line, error: parseError });
        }
      }
    }

    throw new ApiError("Stream ended without result", 500);
  } catch (error: any) {
    if (error.name === "AbortError") {
      logger.error("API long request timed out", { path, timeout: timeoutMs });
      throw new ApiError("Request timed out", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
