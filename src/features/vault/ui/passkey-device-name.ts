// Produce a friendly default name for a freshly registered passkey so it never
// shows up as "unknown device". Brand terms (Touch ID, Windows Hello, iPhone) read
// the same across locales; the generic case uses the caller-provided localized
// fallback. The name is only a default — users can rename it in settings.
export function detectPasskeyDeviceName(fallback: string): string {
  if (typeof navigator === "undefined") return fallback;
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac · Touch ID";
  if (/Windows/.test(ua)) return "Windows Hello";
  if (/Android/.test(ua)) return "Android";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return fallback;
}
