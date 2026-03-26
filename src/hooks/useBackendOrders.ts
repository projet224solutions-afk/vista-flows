/**
 * 📦 HOOK - useBackendOrders
 * React Query hook pour les commandes via le backend Node.js Phase 4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  createOrder,
  listMyOrders,
  getOrder,
  cancelOrder,
  type CreateOrderPayload,
} from '@/services/orderBackendService';
import { toast } from 'sonner';

const ORDERS_KEY = ['backend-orders'];

export function useBackendOrders(params?: { status?: string; limit?: number }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...ORDERS_KEY, params],
    queryFn: async ({ signal }) => {
      const res = await listMyOrders(params, signal);
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useBackendOrder(orderId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...ORDERS_KEY, orderId],
    queryFn: async ({ signal }) => {
      const res = await getOrder(orderId!, signal);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!user && !!orderId,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Commande créée avec succès');
        qc.invalidateQueries({ queryKey: ORDERS_KEY });
      } else {
        toast.error(res.error || 'Erreur lors de la création');
      }
    },
    onError: () => {
      toast.error('Erreur réseau lors de la commande');
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      cancelOrder(orderId, reason),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Commande annulée');
        qc.invalidateQueries({ queryKey: ORDERS_KEY });
      } else {
        toast.error(res.error || 'Impossible d\'annuler');
      }
    },
  });
}
