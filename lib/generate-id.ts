// crypto.randomUUID()는 보안 컨텍스트(localhost/HTTPS)에서만 제공된다.
// LAN IP(http://192.168.x.x:3000)로 접속하면 존재하지 않아 TypeError가 발생하므로 폴백을 둔다.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
