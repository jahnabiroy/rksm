export function normalizeAmount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

export function pathnameIsAdmin(pathname) {
  return pathname.startsWith('/admin');
}
