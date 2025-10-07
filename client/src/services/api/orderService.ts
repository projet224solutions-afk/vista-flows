import { apiRequest } from "@/lib/queryClient";

export interface Order {
  id: string;
  customerId: string;
  vendorId: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  deliveryAddress?: string;
  items?: OrderItem[];
  createdAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderData {
  customerId: string;
  vendorId: string;
  totalAmount: number;
  deliveryAddress?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

export class OrderApiService {
  static async getOrders(vendorId?: string, customerId?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (vendorId) params.append('vendorId', vendorId);
    if (customerId) params.append('customerId', customerId);
    
    return apiRequest(`/api/orders?${params.toString()}`);
  }

  static async getOrderById(orderId: string): Promise<Order> {
    return apiRequest(`/api/orders/${orderId}`);
  }

  static async createOrder(data: CreateOrderData): Promise<Order> {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return apiRequest(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  static async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<Order> {
    return apiRequest(`/api/orders/${orderId}/payment-status`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  }

  static async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return apiRequest(`/api/orders/${orderId}/items`);
  }
}
