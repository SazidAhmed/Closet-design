import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(imageUrl?: string | null, fallback = 'https://placehold.co/40x30'): string {
  if (!imageUrl) return fallback
  return imageUrl
}
