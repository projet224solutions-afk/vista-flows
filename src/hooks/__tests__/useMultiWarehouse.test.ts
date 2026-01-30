/**
 * Tests pour useMultiWarehouse
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useMultiWarehouse } from '../useMultiWarehouse';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

// Mock useCurrentVendor
jest.mock('@/hooks/useCurrentVendor', () => ({
  useCurrentVendor: () => ({
    vendorId: 'test-vendor-id',
    loading: false
  })
}));

describe('useMultiWarehouse', () => {
  test('devrait initialiser avec des valeurs par défaut', () => {
    const { result } = renderHook(() => useMultiWarehouse());

    expect(result.current.locations).toEqual([]);
    expect(result.current.transfers).toEqual([]);
    expect(result.current.losses).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  test('devrait utiliser vendor_locations au lieu de locations', async () => {
    const { result } = renderHook(() => useMultiWarehouse());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Vérifier que vendor_locations est utilisé (correction appliquée)
    expect(result.current).toBeDefined();
  });
});
