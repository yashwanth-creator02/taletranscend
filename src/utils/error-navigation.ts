// src/utils/error-navigation.ts
//
// Maps runtime failures onto the static error pages in src/views.
//
// Error pages are ordinary MPA documents, so routing to one is a full page
// load. Keeping the mapping and the sessionStorage hand-off in one module
// means every page reports the same failure the same way, and the error page
// has exactly one source of context to read.

import { createLogger } from './logger.ts';

const log = createLogger('ErrorNavigation');

export const ERROR_CODES = [400, 401, 403, 404, 405, 408, 429, 500, 502, 503, 504] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_PAGE_PATHS: Record<ErrorCode, string> = {
  400: '/400.html',
  401: '/401.html',
  403: '/403.html',
  404: '/404.html',
  405: '/405.html',
  408: '/408.html',
  429: '/429.html',
  500: '/500.html',
  502: '/502.html',
  503: '/503.html',
  504: '/504.html',
};

const ERROR_LABELS: Record<ErrorCode, string> = {
  400: 'Bad Request',
  401: 'Sign-In Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  429: 'Too Many Requests',
  500: 'Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

const FIREBASE_CODE_MAP: Record<string, ErrorCode> = {
  'permission-denied': 403,
  unauthenticated: 401,
  unavailable: 503,
  'deadline-exceeded': 504,
  'resource-exhausted': 429,
  'invalid-argument': 400,
  'not-found': 404,
  'failed-precondition': 400,
  'out-of-range': 400,
  'already-exists': 400,
  unimplemented: 405,
  internal: 500,
  'data-loss': 500,
  unknown: 500,
  'network-request-failed': 503,
  'too-many-requests': 429,
  'requires-recent-login': 401,
  'user-token-expired': 401,
};

const ABORTED_CODES = new Set(['cancelled', 'canceled', 'aborted']);

export const ERROR_CONTEXT_KEY = 'tt_error_context';
export const ERROR_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;

export interface ErrorContext {
  code: ErrorCode;
  source: string;
  reason?: string;
  createdAt: number;
}

export interface ClassifyErrorOptions {
  offline?: boolean;
  fallback?: ErrorCode | null;
}

export interface NavigateErrorOptions {
  source?: string;
  reason?: string;
  replace?: boolean;
}

export interface RouteErrorOptions {
  fallback?: ErrorCode | null;
  source?: string;
}

export interface ErrorBoundaryOptions {
  fatalFallback?: ErrorCode | null;
}

function isErrorCode(value: number): value is ErrorCode {
  return (ERROR_CODES as readonly number[]).includes(value);
}

export function errorPagePath(code: number): string {
  return isErrorCode(code) ? ERROR_PAGE_PATHS[code] : ERROR_PAGE_PATHS[500];
}

export function errorCodeLabel(code: number): string {
  return isErrorCode(code) ? ERROR_LABELS[code] : ERROR_LABELS[500];
}

/**
 * Returns the HTTP code represented by an error-page pathname, or null when
 * the path is an ordinary application route.
 */
export function getErrorCodeFromPath(pathname: string): ErrorCode | null {
  if (!pathname) return null;

  const cleanPath = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
  const match = cleanPath.match(/^\/(\d{3})(?:\.html)?$/);
  if (!match) return null;

  const code = Number.parseInt(match[1], 10);
  return isErrorCode(code) ? code : null;
}

export function isErrorPagePath(pathname: string): boolean {
  return getErrorCodeFromPath(pathname) !== null;
}

function readStatus(error: Record<string, unknown>): number | null {
  const candidates: unknown[] = [error.status, error.statusCode];
  const response = error.response;
  if (response && typeof response === 'object') {
    const responseRecord = response as Record<string, unknown>;
    candidates.push(responseRecord.status, responseRecord.statusCode);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isInteger(candidate)) return candidate;
  }
  return null;
}

function errorName(error: Record<string, unknown>): string {
  return typeof error.name === 'string' ? error.name : '';
}

function errorMessage(error: Record<string, unknown>): string {
  return typeof error.message === 'string' ? error.message : '';
}

/**
 * Classifies a thrown value as one of the supported HTTP error codes.
 *
 * Returns null for cancellations and unrecognised errors unless a fallback is
 * supplied. Callers that know an error is page-fatal can pass `fallback: 500`.
 */
export function classifyError(
  error: unknown,
  options: ClassifyErrorOptions = {}
): ErrorCode | null {
  if (!error || typeof error !== 'object') {
    return options.fallback ?? null;
  }

  const record = error as Record<string, unknown>;
  const name = errorName(record);
  const message = errorMessage(record);

  if (name === 'AbortError') return null;

  const rawCode = typeof record.code === 'string' ? record.code.trim() : '';
  const bareCode = rawCode.includes('/') ? rawCode.slice(rawCode.lastIndexOf('/') + 1) : rawCode;
  if (ABORTED_CODES.has(bareCode.toLowerCase())) return null;

  if (
    name === 'ChunkLoadError' ||
    /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(
      `${name} ${message}`
    )
  ) {
    return 500;
  }

  const status = readStatus(record);
  if (status !== null && isErrorCode(status)) return status;

  if (bareCode && FIREBASE_CODE_MAP[bareCode]) return FIREBASE_CODE_MAP[bareCode];

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 503;

  if (
    name === 'TypeError' &&
    /failed to fetch|networkerror|network request failed|load failed/i.test(message)
  ) {
    return 503;
  }

  return options.fallback ?? null;
}

/**
 * Returns a short, non-sensitive description of an error for the context
 * panel. Deliberately excludes `message`, which can contain document paths.
 */
export function describeError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const record = error as Record<string, unknown>;
  if (typeof record.code === 'string' && record.code.trim()) {
    return record.code.trim().slice(0, 120);
  }

  const status = readStatus(record);
  if (status !== null) return `HTTP ${status}`;

  const name = errorName(record);
  if (name && name !== 'Error') return name.slice(0, 120);

  return undefined;
}

function normalizeSource(source: string): string {
  if (typeof source !== 'string') return '/';
  const trimmed = source.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  return trimmed.slice(0, 300);
}

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function clearErrorContext(): void {
  try {
    sessionStorageOrNull()?.removeItem(ERROR_CONTEXT_KEY);
  } catch {
    // Storage can be unavailable in private or locked-down contexts.
  }
}

/**
 * Stores the failure context and navigates to the matching error page.
 *
 * The navigation is a no-op while already on an error page, which is the
 * loop guard that keeps a broken error page from redirecting to itself.
 *
 * @returns true when a navigation was started.
 */
export function navigateToErrorPage(code: number, options: NavigateErrorOptions = {}): boolean {
  if (typeof window === 'undefined') return false;
  if (isErrorPagePath(window.location.pathname)) return false;

  const resolvedCode: ErrorCode = isErrorCode(code) ? code : 500;
  const source = normalizeSource(
    options.source ?? `${window.location.pathname}${window.location.search}`
  );

  const context: ErrorContext = {
    code: resolvedCode,
    source,
    createdAt: Date.now(),
  };
  if (options.reason) context.reason = options.reason.slice(0, 120);

  try {
    sessionStorageOrNull()?.setItem(ERROR_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // A missing context panel is better than blocking the error page.
  }

  const target = ERROR_PAGE_PATHS[resolvedCode];
  log.info('Routing to error page', { code: resolvedCode, source });

  try {
    if (options.replace !== false && typeof window.location.replace === 'function') {
      window.location.replace(target);
    } else if (typeof window.location.assign === 'function') {
      window.location.assign(target);
    } else {
      window.location.href = target;
    }
  } catch (err) {
    log.error('Could not navigate to error page', err);
    return false;
  }

  return true;
}

/**
 * Reads the context written by navigateToErrorPage. Invalid or expired
 * contexts are removed rather than displayed.
 */
export function readErrorContext(maxAgeMs = ERROR_CONTEXT_MAX_AGE_MS): ErrorContext | null {
  const storage = sessionStorageOrNull();
  if (!storage) return null;

  try {
    const raw = storage.getItem(ERROR_CONTEXT_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      storage.removeItem(ERROR_CONTEXT_KEY);
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const code = typeof record.code === 'number' ? record.code : Number.NaN;
    const createdAt = typeof record.createdAt === 'number' ? record.createdAt : Number.NaN;
    const source = typeof record.source === 'string' ? record.source : '';
    const now = Date.now();

    const sourceIsSafe = source.startsWith('/') && !source.startsWith('//');
    const ageIsPlausible = createdAt <= now + 60_000 && now - createdAt <= maxAgeMs;

    if (!isErrorCode(code) || !Number.isFinite(createdAt) || !sourceIsSafe || !ageIsPlausible) {
      storage.removeItem(ERROR_CONTEXT_KEY);
      return null;
    }

    const context: ErrorContext = {
      code,
      source: source.slice(0, 300),
      createdAt,
    };

    if (typeof record.reason === 'string' && record.reason.trim()) {
      context.reason = record.reason.trim().slice(0, 120);
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * Classifies an error and routes to its page when a code is known. This is
 * the helper page controllers call from their init catch blocks.
 */
export function routeError(error: unknown, options: RouteErrorOptions = {}): ErrorCode | null {
  const code = classifyError(error, { fallback: options.fallback ?? null });
  if (!code) return null;

  const navigated = navigateToErrorPage(code, {
    source: options.source,
    reason: describeError(error),
  });

  return navigated ? code : null;
}

let errorBoundaryInstalled = false;

function isBenignError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  if (errorName(record) === 'AbortError') return true;

  return /ResizeObserver loop|^Script error\.?$/i.test(errorMessage(record));
}

function isSameOrigin(filename: string): boolean {
  if (!filename) return true;

  try {
    return new URL(filename, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Installs the global last-resort boundary. Call once from initPageReveal().
 *
 * Classified failures redirect from both event types. Uncaught synchronous
 * errors also redirect to `fatalFallback` when it is set, because an
 * exception that escaped every handler has left the page in an unknown
 * state. Unhandled rejections with no recognised code are left alone: a
 * promise rejected by a background task is often recoverable.
 */
export function installErrorBoundary(options: ErrorBoundaryOptions = {}): void {
  if (typeof window === 'undefined' || errorBoundaryInstalled) return;
  errorBoundaryInstalled = true;

  const fatalFallback = options.fatalFallback ?? null;

  const handle = (error: unknown, useFatalFallback: boolean): void => {
    if (isErrorPagePath(window.location.pathname)) return;
    if (isBenignError(error)) return;

    const code = classifyError(error, {
      fallback: useFatalFallback ? fatalFallback : null,
    });
    if (!code) return;

    navigateToErrorPage(code, { reason: describeError(error) });
  };

  window.addEventListener('unhandledrejection', (event) => {
    handle((event as PromiseRejectionEvent).reason, false);
  });

  window.addEventListener('error', (event) => {
    const errorEvent = event as ErrorEvent;
    if (!errorEvent.error) return;
    if (errorEvent.filename && !isSameOrigin(errorEvent.filename)) return;
    handle(errorEvent.error, true);
  });
}
