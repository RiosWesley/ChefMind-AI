import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { MenuService } from './menu-service';
import { RestaurantService } from './restaurant-service';
import { Order, OrderItem, OrderStatus, DeliveryType, CreateOrderData, UpdateOrderData } from '../types/order';

export class OrderService {
  private db: DatabaseService;
  private menuService: MenuService;
  private restaurantService: RestaurantService;

  constructor(db: DatabaseService, menuService: MenuService, restaurantService: RestaurantService) {
    this.db = db;
    this.menuService = menuService;
    this.restaurantService = restaurantService;
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const ticket = await this.db.query(`
      SELECT id, contact_number FROM tickets WHERE id = $1
    `, [data.ticketId]);

    if (ticket.rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const contactNumber = ticket.rows[0].contact_number;

    if (data.deliveryType === DeliveryType.DELIVERY && !data.deliveryAddress) {
      throw new Error('Delivery address is required for delivery orders');
    }

    const restaurantInfo = await this.restaurantService.getRestaurantInfo();
    if (restaurantInfo && restaurantInfo.openingHours) {
      const isOpen = this.restaurantService.isRestaurantOpen(restaurantInfo.openingHours);
      if (!isOpen) {
        throw new Error('Restaurant is currently closed');
      }
    }

    const orderItems: Array<{ menuItem: { id: string; price: number }; quantity: number; notes?: string }> = [];

    for (const item of data.items) {
      const menuItem = await this.menuService.getMenuItem(item.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item ${item.menuItemId} not found`);
      }

      const isAvailable = await this.menuService.isMenuItemAvailable(item.menuItemId);
      if (!isAvailable) {
        throw new Error(`Menu item ${menuItem.name} is not available`);
      }

      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for item ${menuItem.name}`);
      }

      orderItems.push({
        menuItem: { id: menuItem.id, price: menuItem.price },
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const subtotal = this.calculateSubtotal(orderItems);
    const deliveryFee = await this.restaurantService.calculateDeliveryFee(
      subtotal,
      data.deliveryAddress
    );

    const deliveryInfo = await this.restaurantService.getDeliveryInfo(data.deliveryAddress);
    if (data.deliveryType === DeliveryType.DELIVERY && deliveryInfo) {
      if (deliveryInfo.isAddressInArea === false) {
        throw new Error('Delivery address is outside delivery area');
      }
      if (deliveryInfo.minOrderValue && subtotal < deliveryInfo.minOrderValue) {
        throw new Error(`Minimum order value is ${deliveryInfo.minOrderValue}`);
      }
    }

    const total = subtotal + deliveryFee;
    const estimatedTime = deliveryInfo?.estimatedDeliveryTimeMinutes || 30;

    const orderId = uuidv4();
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      const orderResult = await client.query(`
        INSERT INTO orders (
          id, ticket_id, contact_number, status, delivery_type, delivery_address,
          subtotal, delivery_fee, total, estimated_time_minutes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        orderId,
        data.ticketId,
        contactNumber,
        OrderStatus.PENDING,
        data.deliveryType,
        data.deliveryAddress || null,
        subtotal.toFixed(2),
        deliveryFee.toFixed(2),
        total.toFixed(2),
        estimatedTime,
      ]);

      for (const item of orderItems) {
        const itemSubtotal = item.menuItem.price * item.quantity;
        await client.query(`
          INSERT INTO order_items (
            id, order_id, menu_item_id, quantity, unit_price, subtotal, notes, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          uuidv4(),
          orderId,
          item.menuItem.id,
          item.quantity,
          item.menuItem.price.toFixed(2),
          itemSubtotal.toFixed(2),
          item.notes || null,
        ]);
      }

      await client.query('COMMIT');

      return await this.getOrder(orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const result = await this.db.query(`
      SELECT 
        id,
        ticket_id,
        contact_number,
        status,
        delivery_type,
        delivery_address,
        subtotal,
        delivery_fee,
        total,
        estimated_time_minutes,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at
      FROM orders
      WHERE id = $1
    `, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const order = this.mapRowToOrder(result.rows[0]);
    const items = await this.getOrderItems(orderId);
    order.items = items;

    return order;
  }

  async updateOrder(orderId: string, data: UpdateOrderData): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      throw new Error(`Cannot update order with status ${order.status}`);
    }

    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      if (data.itemsToRemove && data.itemsToRemove.length > 0) {
        for (const itemId of data.itemsToRemove) {
          await client.query(`
            DELETE FROM order_items WHERE id = $1 AND order_id = $2
          `, [itemId, orderId]);
        }
      }

      if (data.itemsToUpdate && data.itemsToUpdate.length > 0) {
        for (const update of data.itemsToUpdate) {
          const item = await client.query(`
            SELECT unit_price FROM order_items WHERE id = $1 AND order_id = $2
          `, [update.orderItemId, orderId]);

          if (item.rows.length === 0) {
            throw new Error(`Order item ${update.orderItemId} not found`);
          }

          if (update.quantity <= 0) {
            await client.query(`
              DELETE FROM order_items WHERE id = $1 AND order_id = $2
            `, [update.orderItemId, orderId]);
          } else {
            const unitPrice = parseFloat(item.rows[0].unit_price);
            const subtotal = unitPrice * update.quantity;

            await client.query(`
              UPDATE order_items
              SET quantity = $1, subtotal = $2
              WHERE id = $3 AND order_id = $4
            `, [update.quantity, subtotal.toFixed(2), update.orderItemId, orderId]);
          }
        }
      }

      if (data.itemsToAdd && data.itemsToAdd.length > 0) {
        for (const item of data.itemsToAdd) {
          const menuItem = await this.menuService.getMenuItem(item.menuItemId);
          if (!menuItem) {
            throw new Error(`Menu item ${item.menuItemId} not found`);
          }

          const isAvailable = await this.menuService.isMenuItemAvailable(item.menuItemId);
          if (!isAvailable) {
            throw new Error(`Menu item ${menuItem.name} is not available`);
          }

          if (item.quantity <= 0) {
            throw new Error(`Invalid quantity for item ${menuItem.name}`);
          }

          const itemSubtotal = menuItem.price * item.quantity;
          await client.query(`
            INSERT INTO order_items (
              id, order_id, menu_item_id, quantity, unit_price, subtotal, notes, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            uuidv4(),
            orderId,
            menuItem.id,
            item.quantity,
            menuItem.price.toFixed(2),
            itemSubtotal.toFixed(2),
            item.notes || null,
          ]);
        }
      }

      const updatedOrder = await this.getOrder(orderId);
      if (!updatedOrder || !updatedOrder.items) {
        throw new Error('Failed to retrieve updated order');
      }

      const subtotal = this.calculateSubtotalFromItems(updatedOrder.items);
      const deliveryFee = parseFloat(order.deliveryFee.toString());
      const total = subtotal + deliveryFee;

      await client.query(`
        UPDATE orders
        SET subtotal = $1, total = $2, updated_at = NOW()
        WHERE id = $3
      `, [subtotal.toFixed(2), total.toFixed(2), orderId]);

      await client.query('COMMIT');

      return await this.getOrder(orderId) as Order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new Error('Order is already cancelled');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel a delivered order');
    }

    await this.db.query(`
      UPDATE orders
      SET status = $1, cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
      WHERE id = $3
    `, [OrderStatus.CANCELLED, reason || null, orderId]);

    const cancelledOrder = await this.getOrder(orderId);
    if (!cancelledOrder) {
      throw new Error('Failed to retrieve cancelled order');
    }

    return cancelledOrder;
  }

  async listOrdersByTicket(ticketId: string, status?: OrderStatus, limit = 10): Promise<Order[]> {
    let query = `
      SELECT 
        id,
        ticket_id,
        contact_number,
        status,
        delivery_type,
        delivery_address,
        subtotal,
        delivery_fee,
        total,
        estimated_time_minutes,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at
      FROM orders
      WHERE ticket_id = $1
    `;

    const params: unknown[] = [ticketId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
      query += ` ORDER BY created_at DESC LIMIT $3`;
      params.push(limit);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await this.db.query(query, params);
    const orders = result.rows.map(row => this.mapRowToOrder(row));

    for (const order of orders) {
      order.items = await this.getOrderItems(order.id);
    }

    return orders;
  }

  async calculateOrderTotal(order: Order): Promise<number> {
    if (!order.items) {
      return parseFloat(order.total.toString());
    }

    const subtotal = this.calculateSubtotalFromItems(order.items);
    const deliveryFee = parseFloat(order.deliveryFee.toString());
    return subtotal + deliveryFee;
  }

  private async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await this.db.query(`
      SELECT 
        id,
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        subtotal,
        notes,
        created_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY created_at
    `, [orderId]);

    return result.rows.map(row => this.mapRowToOrderItem(row));
  }

  private calculateSubtotal(
    items: Array<{ menuItem: { price: number }; quantity: number }>
  ): number {
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  private calculateSubtotalFromItems(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  private mapRowToOrder(row: {
    id: string;
    ticket_id: string;
    contact_number: string;
    status: string;
    delivery_type: string;
    delivery_address: string | null;
    subtotal: string;
    delivery_fee: string;
    total: string;
    estimated_time_minutes: number | null;
    cancelled_at: Date | null;
    cancellation_reason: string | null;
    created_at: Date;
    updated_at: Date;
  }): Order {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      contactNumber: row.contact_number,
      status: row.status as OrderStatus,
      deliveryType: row.delivery_type as DeliveryType,
      deliveryAddress: row.delivery_address || undefined,
      subtotal: parseFloat(row.subtotal),
      deliveryFee: parseFloat(row.delivery_fee),
      total: parseFloat(row.total),
      estimatedTimeMinutes: row.estimated_time_minutes || undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
      cancellationReason: row.cancellation_reason || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToOrderItem(row: {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    notes: string | null;
    created_at: Date;
  }): OrderItem {
    return {
      id: row.id,
      orderId: row.order_id,
      menuItemId: row.menu_item_id,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price),
      subtotal: parseFloat(row.subtotal),
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}




