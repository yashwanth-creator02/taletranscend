// src/utils/logger.ts
// Centralized logging utility that respects Dev Mode.

const IS_DEV_MODE =
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_DEV_MODE === 'true';

/**
 * Higher-order function to create a logger with a specific context.
 *
 * @param context - The module or component name (e.g., 'Auth', 'ProfileService')
 */
export function createLogger(context: string) {
  const prefix = `%c[${context}]%c`;
  const style = 'color: #6366f1; font-weight: bold;';
  const reset = '';

  return {
    log: (message: string, ...args: any[]) => {
      if (IS_DEV_MODE) {
        console.log(`${prefix} ${message}`, style, reset, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (IS_DEV_MODE) {
        console.warn(`${prefix} ${message}`, style, reset, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (IS_DEV_MODE) {
        console.error(`${prefix} ${message}`, style, reset, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (IS_DEV_MODE) {
        console.info(`${prefix} ${message}`, style, reset, ...args);
      }
    },
    debug: (message: string, ...args: any[]) => {
      if (IS_DEV_MODE) {
        console.debug(`${prefix} ${message}`, style, reset, ...args);
      }
    },
  };
}

/**
 * Default global logger.
 */
export const logger = createLogger('TT');
