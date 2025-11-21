export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
  };
}

export interface RestaurantInfo {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  openingHours?: OpeningHours;
  deliveryArea?: string[];
  deliveryFee?: number;
  minOrderValue?: number;
  estimatedDeliveryTimeMinutes?: number;
  updatedAt: Date;
}

export interface DeliveryInfo {
  deliveryArea: string[];
  deliveryFee: number;
  minOrderValue: number;
  estimatedDeliveryTimeMinutes: number;
  isAddressInArea?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
}




