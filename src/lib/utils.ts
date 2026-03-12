import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Returns the current date/time in Brazil timezone as an ISO string.
 * Use this instead of new Date().toISOString() throughout the app.
 */
export function brazilNowISO(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: BRAZIL_TZ }).replace(' ', 'T') + '-03:00';
}

/**
 * Returns today's date string "YYYY-MM-DD" in Brazil timezone.
 */
export function brazilTodayString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BRAZIL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts; // en-CA format is YYYY-MM-DD
}

/**
 * Returns a Date object representing the current time adjusted to Brazil timezone.
 */
export function brazilNow(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: BRAZIL_TZ });
  return new Date(str);
}

/**
 * Parse a "YYYY-MM-DD" date string into a local Date (avoids UTC shift).
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date to "YYYY-MM-DD" using local components (avoids UTC shift).
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
