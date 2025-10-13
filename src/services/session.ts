export function saveJwtToken(token: string) {
  try { localStorage.setItem('app_jwt', token); } catch {}
}

export function getJwtToken(): string | null {
  try { return localStorage.getItem('app_jwt'); } catch { return null; }
}

export function clearJwtToken() {
  try { localStorage.removeItem('app_jwt'); } catch {}
}


