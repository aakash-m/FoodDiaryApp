/** Stored photo size: longest edge (PLAN.md §3). */
export const MAX_PHOTO_EDGE = 1600;

/** Resize target that fits the image within `max` on its longest edge, or null if it already fits. */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_EDGE): { width: number } | { height: number } | null {
  if (width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
