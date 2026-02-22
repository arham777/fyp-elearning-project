import apiClient from './apiClient';

export interface CategoryItem {
  id: number;
  name: string;
  group: string;
  is_active: boolean;
  order: number;
}

export interface CategoryGroup {
  name: string;
  categories: string[];
}

/**
 * Fetch all active categories from the backend (public endpoint, no auth needed).
 */
export const categoriesApi = {
  async getCategories(): Promise<CategoryItem[]> {
    const response = await apiClient.get('/categories/');
    return response.data;
  },

  /**
   * Returns categories grouped by group name, matching the old CATEGORY_GROUPS format.
   */
  async getCategoryGroups(): Promise<CategoryGroup[]> {
    const items = await this.getCategories();
    const groupMap = new Map<string, string[]>();

    for (const item of items) {
      if (!groupMap.has(item.group)) {
        groupMap.set(item.group, []);
      }
      groupMap.get(item.group)!.push(item.name);
    }

    return Array.from(groupMap.entries()).map(([name, categories]) => ({
      name,
      categories,
    }));
  },

  /**
   * Returns a flat array of all category names.
   */
  async getAllCategoryNames(): Promise<string[]> {
    const items = await this.getCategories();
    return items.map((c) => c.name);
  },
};
