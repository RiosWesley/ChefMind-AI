import { DatabaseService } from './database-service';
import { MenuItem, MenuCategory, MenuItemDetails } from '../types/menu';

export class MenuService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async getMenu(categoryId?: string): Promise<MenuItem[]> {
    if (categoryId) {
      return this.getMenuByCategory(categoryId);
    }

    const result = await this.db.query(`
      SELECT 
        mi.id,
        mi.category_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.ingredients,
        mi.allergens,
        mi.is_available,
        mi.display_order,
        mi.created_at
      FROM menu_items mi
      INNER JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.is_available = true AND mc.is_active = true
      ORDER BY mc.display_order, mi.display_order, mi.name
    `);

    return result.rows.map(row => this.mapRowToMenuItem(row));
  }

  async getMenuByCategory(categoryId: string): Promise<MenuItem[]> {
    const result = await this.db.query(`
      SELECT 
        mi.id,
        mi.category_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.ingredients,
        mi.allergens,
        mi.is_available,
        mi.display_order,
        mi.created_at
      FROM menu_items mi
      INNER JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.category_id = $1 AND mi.is_available = true AND mc.is_active = true
      ORDER BY mi.display_order, mi.name
    `, [categoryId]);

    return result.rows.map(row => this.mapRowToMenuItem(row));
  }

  async searchMenuItem(query: string, categoryId?: string): Promise<MenuItem[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    if (categoryId) {
      const result = await this.db.query(`
        SELECT 
          mi.id,
          mi.category_id,
          mi.name,
          mi.description,
          mi.price,
          mi.image_url,
          mi.ingredients,
          mi.allergens,
          mi.is_available,
          mi.display_order,
          mi.created_at
        FROM menu_items mi
        INNER JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.category_id = $1 
          AND mi.is_available = true 
          AND mc.is_active = true
          AND (LOWER(mi.name) LIKE $2 OR LOWER(mi.description) LIKE $2)
        ORDER BY mi.display_order, mi.name
      `, [categoryId, searchTerm]);

      return result.rows.map(row => this.mapRowToMenuItem(row));
    }

    const result = await this.db.query(`
      SELECT 
        mi.id,
        mi.category_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.ingredients,
        mi.allergens,
        mi.is_available,
        mi.display_order,
        mi.created_at
      FROM menu_items mi
      INNER JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.is_available = true 
        AND mc.is_active = true
        AND (LOWER(mi.name) LIKE $1 OR LOWER(mi.description) LIKE $1)
      ORDER BY mc.display_order, mi.display_order, mi.name
    `, [searchTerm]);

    return result.rows.map(row => this.mapRowToMenuItem(row));
  }

  async getMenuItemDetails(menuItemId: string): Promise<MenuItemDetails | null> {
    const result = await this.db.query(`
      SELECT 
        mi.id,
        mi.category_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.ingredients,
        mi.allergens,
        mi.is_available,
        mi.display_order,
        mi.created_at,
        mc.id as category_id_full,
        mc.name as category_name,
        mc.description as category_description,
        mc.display_order as category_display_order,
        mc.is_active as category_is_active,
        mc.created_at as category_created_at
      FROM menu_items mi
      INNER JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1
    `, [menuItemId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const menuItem = this.mapRowToMenuItem(row);
    const category: MenuCategory = {
      id: row.category_id_full,
      name: row.category_name,
      description: row.category_description,
      displayOrder: row.category_display_order,
      isActive: row.category_is_active,
      createdAt: new Date(row.category_created_at),
    };

    return {
      ...menuItem,
      category,
    };
  }

  async getMenuItem(menuItemId: string): Promise<MenuItem | null> {
    const result = await this.db.query(`
      SELECT 
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        ingredients,
        allergens,
        is_available,
        display_order,
        created_at
      FROM menu_items
      WHERE id = $1
    `, [menuItemId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMenuItem(result.rows[0]);
  }

  async isMenuItemAvailable(menuItemId: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT mi.is_available, mc.is_active
      FROM menu_items mi
      INNER JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1
    `, [menuItemId]);

    if (result.rows.length === 0) {
      return false;
    }

    const row = result.rows[0];
    return row.is_available && row.is_active;
  }

  async getCategories(): Promise<MenuCategory[]> {
    const result = await this.db.query(`
      SELECT 
        id,
        name,
        description,
        display_order,
        is_active,
        created_at
      FROM menu_categories
      WHERE is_active = true
      ORDER BY display_order, name
    `);

    return result.rows.map(row => this.mapRowToCategory(row));
  }

  private mapRowToMenuItem(row: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: string;
    image_url: string | null;
    ingredients: string[] | null;
    allergens: string[] | null;
    is_available: boolean;
    display_order: number;
    created_at: Date;
  }): MenuItem {
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description || undefined,
      price: parseFloat(row.price),
      imageUrl: row.image_url || undefined,
      ingredients: row.ingredients || undefined,
      allergens: row.allergens || undefined,
      isAvailable: row.is_available,
      displayOrder: row.display_order,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRowToCategory(row: {
    id: string;
    name: string;
    description: string | null;
    display_order: number;
    is_active: boolean;
    created_at: Date;
  }): MenuCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }
}




