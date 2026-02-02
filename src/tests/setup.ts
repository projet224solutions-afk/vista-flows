/**
 * Setup des tests - Configuration Vitest
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Mock de Supabase Client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      limit: vi.fn().mockReturnThis(),
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Configuration globale
beforeAll(() => {
  // Initialiser les variables globales
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
});

afterAll(() => {
  // Cleanup
  vi.clearAllMocks();
});
