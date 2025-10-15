export function saveJwtToken(token: string) {
  try { localStorage.setItem('app_jwt', token); } catch { /* Ignore storage errors */ }
}

export function getJwtToken(): string | null {
  try { return localStorage.getItem('app_jwt'); } catch { /* Ignore storage errors */ return null; }
}

export function clearJwtToken() {
  try { localStorage.removeItem('app_jwt'); } catch { /* Ignore storage errors */ }
}


