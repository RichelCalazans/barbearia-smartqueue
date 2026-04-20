export function diag(tag: string, data?: unknown) {
  if (typeof window === 'undefined') return;
  const detail = { tag, data, at: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent('sqdiag', { detail }));
  } catch {
    // ignore
  }
}
