import { DatabaseService } from './database-service';
import { RestaurantInfo, DeliveryInfo, Promotion, OpeningHours } from '../types/restaurant';
import { DiscountType } from '../types/restaurant';

export class RestaurantService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async getRestaurantInfo(): Promise<RestaurantInfo | null> {
    const result = await this.db.query(`
      SELECT 
        id,
        name,
        phone,
        address,
        opening_hours,
        delivery_area,
        delivery_fee,
        min_order_value,
        estimated_delivery_time_minutes,
        updated_at
      FROM restaurant_info
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRestaurantInfo(result.rows[0]);
  }

  async getRestaurantHours(): Promise<{ hours: OpeningHours; isOpen: boolean } | null> {
    const info = await this.getRestaurantInfo();
    
    if (!info || !info.openingHours) {
      return null;
    }

    const isOpen = this.isRestaurantOpen(info.openingHours);

    return {
      hours: info.openingHours,
      isOpen,
    };
  }

  isRestaurantOpen(openingHours?: OpeningHours): boolean {
    if (!openingHours) {
      return false;
    }

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = openingHours[dayName];

    if (!daySchedule || !daySchedule.open || !daySchedule.close) {
      return false;
    }

    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
  }

  async getDeliveryInfo(address?: string): Promise<DeliveryInfo | null> {
    const info = await this.getRestaurantInfo();
    
    if (!info) {
      return null;
    }

    let isAddressInArea: boolean | undefined;
    if (address && info.deliveryArea && info.deliveryArea.length > 0) {
      const addressLower = address.toLowerCase();
      isAddressInArea = info.deliveryArea.some(area => 
        addressLower.includes(area.toLowerCase()) || area.toLowerCase().includes(addressLower)
      );
    }

    return {
      deliveryArea: info.deliveryArea || [],
      deliveryFee: info.deliveryFee || 0,
      minOrderValue: info.minOrderValue || 0,
      estimatedDeliveryTimeMinutes: info.estimatedDeliveryTimeMinutes || 30,
      isAddressInArea,
    };
  }

  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    const result = await this.db.query(`
      SELECT 
        id,
        title,
        description,
        discount_type,
        discount_value,
        min_order_value,
        valid_from,
        valid_until,
        is_active,
        created_at
      FROM promotions
      WHERE is_active = true
        AND valid_from <= $1
        AND valid_until >= $1
      ORDER BY created_at DESC
    `, [now]);

    return result.rows.map(row => this.mapRowToPromotion(row));
  }

  async calculateDeliveryFee(subtotal: number, address?: string): Promise<number> {
    const deliveryInfo = await this.getDeliveryInfo(address);
    
    if (!deliveryInfo) {
      return 0;
    }

    if (address && deliveryInfo.isAddressInArea === false) {
      return 0;
    }

    return deliveryInfo.deliveryFee || 0;
  }

  private mapRowToRestaurantInfo(row: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    opening_hours: OpeningHours | null;
    delivery_area: string[] | null;
    delivery_fee: string | null;
    min_order_value: string | null;
    estimated_delivery_time_minutes: number | null;
    updated_at: Date;
  }): RestaurantInfo {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || undefined,
      address: row.address || undefined,
      openingHours: row.opening_hours || undefined,
      deliveryArea: row.delivery_area || undefined,
      deliveryFee: row.delivery_fee ? parseFloat(row.delivery_fee) : undefined,
      minOrderValue: row.min_order_value ? parseFloat(row.min_order_value) : undefined,
      estimatedDeliveryTimeMinutes: row.estimated_delivery_time_minutes || undefined,
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToPromotion(row: {
    id: string;
    title: string;
    description: string | null;
    discount_type: string;
    discount_value: string;
    min_order_value: string | null;
    valid_from: Date;
    valid_until: Date;
    is_active: boolean;
    created_at: Date;
  }): Promotion {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      discountType: row.discount_type as DiscountType,
      discountValue: parseFloat(row.discount_value),
      minOrderValue: row.min_order_value ? parseFloat(row.min_order_value) : undefined,
      validFrom: new Date(row.valid_from),
      validUntil: new Date(row.valid_until),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }
}

