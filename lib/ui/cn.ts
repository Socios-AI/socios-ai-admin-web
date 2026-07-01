import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind class lists so later variant/className overrides win predictably.
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
