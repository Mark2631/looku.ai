/** The greeting is based on the device's actual local clock, never a server build timestamp. */
export function greetingForHour(hour: number | null): string {
  if (hour === null || !Number.isInteger(hour) || hour < 0 || hour > 23) return "Welcome back";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
