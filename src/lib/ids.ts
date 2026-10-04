import { randomUUID } from 'expo-crypto';

/** New random UUID (v4) for database rows; stable across devices so data can be synced later. */
export function newId(): string {
  return randomUUID();
}
