
// Service de gestion des commandes
import { supabase } from './supabase';
import type { Order } from './supabase';

export class OrderService {
  // Créer une commande
  static async createOrder(orderData: {
    customer_id: string;
    vendor_id: string;
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    delivery_address: string;
    delivery_city?: string;
    delivery_country?: string;
  }) {
    const { data, error } = await supabase.rpc('create_order', {
      p_customer_id: orderData.customer_id,
      p_vendor_id: orderData.vendor_id,
      p_items: JSON.stringify(orderData.items),
      p_delivery_address: orderData.delivery_address,
      p_delivery_city: orderData.delivery_city || 'Conakry',
      p_delivery_country: orderData.delivery_country || 'Guinée'
    });

    if (error) throw error;
    return data;
  }

  // Mettre à jour le statut d'une commande
  static async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status
    });

    if (error) throw error;
    return data;
  }

  // Obtenir les commandes d'un client
  static async getCustomerOrders(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor:vendor_id(*),
        items:order_items(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Obtenir les commandes d'un vendeur
  static async getVendorOrders(vendorId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id(*),
        items:order_items(*)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
