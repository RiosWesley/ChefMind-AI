export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
}

export interface MenuItemDetails extends MenuItem {
  category?: MenuCategory;
}

export interface CreateMenuItemData {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  isAvailable?: boolean;
  displayOrder?: number;
}




