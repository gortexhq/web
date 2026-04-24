export function pageIdFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'dashboard'
  const seg = pathname.split('/').filter(Boolean)[0]
  return seg ?? 'dashboard'
}
