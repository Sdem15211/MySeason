import { randomUUID } from "crypto";

/**
 * Generates a unique UUID string.
 * NOTE: This uses the Node.js 'crypto' module and is NOT Edge-compatible.
 * Use this only in server-side Node.js environments.
 */
export function generateUUID(): string {
  return randomUUID();
}
