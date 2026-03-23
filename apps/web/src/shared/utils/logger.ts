/**
 * Minimal structured logger that suppresses warnings in production.
 *
 * - `logger.warn()`  → only fires when `import.meta.env.DEV` is true
 * - `logger.error()` → always fires (errors are never silenced)
 */

const isDev =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const logger = {
  warn(msg: string, ...args: unknown[]): void {
    if (isDev) console.warn(msg, ...args);
  },

  error(msg: string, ...args: unknown[]): void {
    console.error(msg, ...args);
  },
};

export default logger;
