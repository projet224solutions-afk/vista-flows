// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import offlineDB from '@/lib/offlineDB';

interface SyncOfflinePosSalesOptions {
  vendorId?: string | null;
  userId?: string | null;
}

interface SyncOfflinePosSalesResult {
  total: number;
  synced: number;
  failed: number;
}

let inFlightSync: Promise<SyncOfflinePosSalesResult> | null = null;

function isPosSaleEvent(event: any) {
  return event?.type === 'sale' || event?.type === 'credit_sale';
}

export async function syncOfflinePosSales(
  options: SyncOfflinePosSalesOptions = {}
): Promise<SyncOfflinePosSalesResult> {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    const { vendorId, userId: providedUserId } = options;

    const pendingEvents = await offlineDB.getPendingEvents();
    const failedEvents = await offlineDB.getFailedEvents();

    const salesEvents = [...pendingEvents, ...failedEvents]
      .filter((event) => {
        if (!isPosSaleEvent(event)) return false;
        if (vendorId && event.vendor_id !== vendorId) return false;
        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (salesEvents.length === 0) {
      return { total: 0, synced: 0, failed: 0 };
    }

    let resolvedUserId: string | null = providedUserId ?? null;
    if (!resolvedUserId) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      resolvedUserId = authData.user?.id ?? null;
    }

    if (!resolvedUserId) {
      throw new Error('Utilisateur non authentifié pour synchroniser les ventes offline');
    }

    let resolvedCustomerId: string | null = null;
    const resolveCustomerId = async (): Promise<string> => {
      if (resolvedCustomerId) return resolvedCustomerId;

      const { data: existingCustomer, error: existingCustomerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (existingCustomerError) throw existingCustomerError;

      if (existingCustomer?.id) {
        resolvedCustomerId = existingCustomer.id;
        return resolvedCustomerId;
      }

      const { data: newCustomer, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ user_id: resolvedUserId })
        .select('id')
        .single();

      if (newCustomerError) throw newCustomerError;
      if (!newCustomer?.id) {
        throw new Error('Impossible de créer le client POS offline');
      }

      resolvedCustomerId = newCustomer.id;
      return resolvedCustomerId;
    };

    let synced = 0;
    let failed = 0;

    for (const event of salesEvents) {
      try {
        const saleData = event.data || {};
        const currentVendorId = event.vendor_id;

        if (!currentVendorId) {
          throw new Error('vendor_id manquant sur l’événement offline');
        }

        const syncOrderNumber = saleData.order_number || `POS-SYNC-${Date.now().toString(36).toUpperCase()}`;
        const customerName = saleData.customer_name || 'Client comptoir';
        const isCreditSale = event.type === 'credit_sale';

        const mappedItems = Array.isArray(saleData.items)
          ? saleData.items.map((item: any) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              product_name: item.product_name,
              images: item.images || [],
            }))
          : [];

        if (mappedItems.length === 0) {
          throw new Error('Aucun article à synchroniser pour cette vente offline');
        }

        const { data: existingOrder, error: existingOrderError } = await supabase
          .from('orders')
          .select('id')
          .eq('vendor_id', currentVendorId)
          .eq('order_number', syncOrderNumber)
          .maybeSingle();

        if (existingOrderError) throw existingOrderError;

        let orderId: string | undefined = existingOrder?.id;
        let createdNewOrder = false;

        if (!orderId) {
          const customerId = await resolveCustomerId();

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              order_number: syncOrderNumber,
              vendor_id: currentVendorId,
              customer_id: customerId,
              total_amount: saleData.total_amount,
              subtotal: saleData.subtotal,
              tax_amount: saleData.tax_amount,
              discount_amount: saleData.discount_amount,
              payment_status: isCreditSale ? 'pending' : 'paid',
              status: 'confirmed',
              payment_method: 'cash',
              shipping_address: isCreditSale
                ? {
                    address: 'Vente à crédit',
                    is_credit_sale: true,
                    customer_name: customerName,
                    customer_phone: saleData.customer_phone || null,
                  }
                : {
                    address: 'Point de vente',
                    customer_name: customerName,
                    customer_phone: saleData.customer_phone || null,
                  },
              notes: isCreditSale
                ? `🔖 VENTE À CRÉDIT (sync offline) - Client: ${customerName}${saleData.customer_phone ? ` - Tél: ${saleData.customer_phone}` : ''}`
                : `Vente offline synchronisée - ${syncOrderNumber}`,
              full_name: customerName,
              source: 'pos',
              created_at: saleData.sale_date || new Date().toISOString(),
            })
            .select('id')
            .single();

          if (orderError) throw orderError;

          orderId = order?.id;
          createdNewOrder = true;
        }

        if (!orderId) {
          throw new Error('Impossible de déterminer la commande à synchroniser');
        }

        const { count: existingItemsCount, error: existingItemsError } = await supabase
          .from('order_items')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId);

        if (existingItemsError) throw existingItemsError;

        if ((existingItemsCount ?? 0) === 0) {
          const orderItems = mappedItems.map((item: any) => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }));

          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

          if (itemsError) {
            if (createdNewOrder) {
              await supabase.from('orders').delete().eq('id', orderId);
            }
            throw itemsError;
          }
        }

        if (isCreditSale) {
          const { data: existingCredit, error: existingCreditError } = await supabase
            .from('vendor_credit_sales')
            .select('id')
            .eq('vendor_id', currentVendorId)
            .eq('order_number', syncOrderNumber)
            .maybeSingle();

          if (existingCreditError) throw existingCreditError;

          if (!existingCredit) {
            const { error: creditError } = await supabase.from('vendor_credit_sales').insert([
              {
                vendor_id: currentVendorId,
                customer_name: customerName,
                customer_phone: saleData.customer_phone || null,
                order_number: syncOrderNumber,
                total: saleData.total_amount,
                subtotal: saleData.subtotal,
                remaining_amount: saleData.total_amount,
                due_date: saleData.due_date,
                notes:
                  saleData.credit_notes ||
                  `Produits: ${mappedItems.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ')}`,
                items: mappedItems.map((item: any) => ({
                  id: item.product_id,
                  name: item.product_name,
                  price: item.unit_price,
                  quantity: item.quantity,
                  images: item.images || [],
                })),
                status: 'pending',
              },
            ]);

            if (creditError) throw creditError;
          }
        } else {
          await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);
        }

        await offlineDB.markEventAsSynced(event.client_event_id);
        synced++;
      } catch (error) {
        failed++;
        console.error('Erreur sync POS offline:', error);
        await offlineDB.markEventAsFailed(event.client_event_id, String(error));
      }
    }

    return {
      total: salesEvents.length,
      synced,
      failed,
    };
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

export default {
  syncOfflinePosSales,
};
