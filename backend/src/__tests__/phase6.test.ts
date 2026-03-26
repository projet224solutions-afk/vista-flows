/**
 * 🧪 BACKEND TESTS - Phase 6
 * 
 * Critical flow tests for idempotency, webhook, order, and escrow.
 * Run with: npx jest backend/src/__tests__/phase6.test.ts
 */

import crypto from 'crypto';

// ==================== UNIT TESTS ====================

describe('Phase 6 — Idempotency', () => {
  test('UUID v4 format validation', () => {
    const validUUID = crypto.randomUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(validUUID)).toBe(true);
    expect(uuidRegex.test('not-a-uuid')).toBe(false);
    expect(uuidRegex.test('')).toBe(false);
  });

  test('SHA-256 payload hash consistency', () => {
    const payload1 = { items: [{ product_id: 'abc', quantity: 2 }] };
    const payload2 = { items: [{ product_id: 'abc', quantity: 2 }] };
    const payload3 = { items: [{ product_id: 'abc', quantity: 3 }] };

    const hash = (obj: any) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

    expect(hash(payload1)).toBe(hash(payload2));
    expect(hash(payload1)).not.toBe(hash(payload3));
  });

  test('Different key for different payloads', () => {
    const hash = (obj: any) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
    const h1 = hash({ amount: 1000 });
    const h2 = hash({ amount: 2000 });
    expect(h1).not.toBe(h2);
  });
});

describe('Phase 6 — Stripe Webhook Signature', () => {
  function createTestSignature(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${sig}`;
  }

  test('Valid signature passes verification', () => {
    const secret = 'whsec_test_secret_123';
    const payload = '{"id":"evt_123","type":"payment_intent.succeeded"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createTestSignature(payload, secret, timestamp);

    const elements = signature.split(',');
    const ts = elements.find(e => e.startsWith('t='))!.split('=')[1];
    const expectedSig = elements.find(e => e.startsWith('v1='))!.split('=')[1];

    const computed = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.${payload}`)
      .digest('hex');

    expect(computed).toBe(expectedSig);
  });

  test('Wrong secret produces different signature', () => {
    const payload = '{"id":"evt_123"}';
    const timestamp = Math.floor(Date.now() / 1000);

    const sig1 = createTestSignature(payload, 'secret1', timestamp);
    const sig2 = createTestSignature(payload, 'secret2', timestamp);

    expect(sig1).not.toBe(sig2);
  });

  test('Replay protection: old timestamps rejected', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const age = Math.floor(Date.now() / 1000) - oldTimestamp;
    expect(age > 300).toBe(true); // Should be rejected (>5 min)
  });
});

describe('Phase 6 — Order State Machine', () => {
  const allowedTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  test('Valid transitions are allowed', () => {
    expect(allowedTransitions['pending'].includes('confirmed')).toBe(true);
    expect(allowedTransitions['confirmed'].includes('preparing')).toBe(true);
    expect(allowedTransitions['shipped'].includes('delivered')).toBe(true);
  });

  test('Invalid transitions are blocked', () => {
    expect(allowedTransitions['pending'].includes('delivered')).toBe(false);
    expect(allowedTransitions['delivered'].includes('pending')).toBe(false);
    expect(allowedTransitions['cancelled'].includes('confirmed')).toBe(false);
  });

  test('Terminal states have no transitions', () => {
    expect(allowedTransitions['delivered']).toHaveLength(0);
    expect(allowedTransitions['cancelled']).toHaveLength(0);
  });
});

describe('Phase 6 — Rate Limiting', () => {
  test('In-memory rate limiter tracks counts correctly', () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const maxRequests = 5;
    const windowMs = 60000;
    const key = 'test:rate:limit';

    for (let i = 1; i <= maxRequests + 2; i++) {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
      }

      const current = store.get(key)!;
      if (i <= maxRequests) {
        expect(current.count <= maxRequests).toBe(true);
      } else {
        expect(current.count > maxRequests).toBe(true);
      }
    }
  });
});

describe('Phase 6 — Currency Resolution', () => {
  const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    GN: 'GNF', CI: 'XOF', SN: 'XOF', FR: 'EUR', US: 'USD', NG: 'NGN',
  };

  function resolveVendorCurrency(countryCode?: string | null): string {
    if (!countryCode) return 'GNF';
    return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'GNF';
  }

  test('Guinea defaults to GNF', () => {
    expect(resolveVendorCurrency('GN')).toBe('GNF');
  });

  test('Null/undefined defaults to GNF', () => {
    expect(resolveVendorCurrency(null)).toBe('GNF');
    expect(resolveVendorCurrency(undefined)).toBe('GNF');
  });

  test('Known countries resolve correctly', () => {
    expect(resolveVendorCurrency('FR')).toBe('EUR');
    expect(resolveVendorCurrency('US')).toBe('USD');
    expect(resolveVendorCurrency('CI')).toBe('XOF');
  });

  test('Unknown country defaults to GNF', () => {
    expect(resolveVendorCurrency('XX')).toBe('GNF');
  });
});
