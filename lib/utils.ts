import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins}m fa`;
  if (diffHours < 24) return `${diffHours}h fa`;
  return `${diffDays}g fa`;
}

export function getTimeUntilDeadline(deadlineString: string): {
  text: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  const deadline = new Date(deadlineString);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: "Scaduto", isExpired: true, isUrgent: false };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isUrgent = diffHours < 2;

  if (diffHours === 0) return { text: `${diffMins}m`, isExpired: false, isUrgent: true };
  if (diffMins === 0) return { text: `${diffHours}h`, isExpired: false, isUrgent };
  return { text: `${diffHours}h ${diffMins}m`, isExpired: false, isUrgent };
}
