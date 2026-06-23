import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard className combiner: clsx for conditional classes, tailwind-merge
 * to dedupe conflicting Tailwind utilities.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
