import { supabase } from '@/integrations/supabase/client';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

export async function initiateEscrow(orderId: string, payerId: string, receiverId: string, amount: number, currency = 'GNF') {
  const resp = await fetch(`${API_BASE}/api/escrow/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderId, payerId, receiverId, amount, currency })
  });
  if (!resp.ok) throw new Error('initiateEscrow failed');
  return await resp.json();
}

export async function releaseEscrow(escrowId: string, commissionPercent = 0) {
  const resp = await fetch(`${API_BASE}/api/escrow/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ escrowId, commissionPercent })
  });
  if (!resp.ok) throw new Error('releaseEscrow failed');
  return await resp.json();
}

export async function refundEscrow(escrowId: string) {
  const resp = await fetch(`${API_BASE}/api/escrow/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ escrowId })
  });
  if (!resp.ok) throw new Error('refundEscrow failed');
  return await resp.json();
}

export async function disputeEscrow(escrowId: string) {
  const resp = await fetch(`${API_BASE}/api/escrow/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ escrowId })
  });
  if (!resp.ok) throw new Error('disputeEscrow failed');
  return await resp.json();
}


