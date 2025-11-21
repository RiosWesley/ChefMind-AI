export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum DeliveryType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  ticketId: string;
  contactNumber: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimatedTimeMinutes?: number;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export interface CreateOrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderData {
  ticketId: string;
  items: CreateOrderItem[];
  deliveryType: DeliveryType;
  deliveryAddress?: string;
}

export interface UpdateOrderData {
  itemsToAdd?: CreateOrderItem[];
  itemsToRemove?: string[];
  itemsToUpdate?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}




