import http from "@/http-common";
import { type ClosetCatalogCategory, type ClosetDoorMode } from "../features/closet/domain/closetCatalogs";

export default {
  /**
   * Fetch closet catalog categories for the given door mode from the backend.
   *
   * @throws if the network request fails or the server returns a non-OK status.
   */
  async getCatalogCategories(doorMode: ClosetDoorMode): Promise<ClosetCatalogCategory[]> {
    try {
      const response = await http.get(`/closet/catalog-categories?doorMode=${doorMode}`);
      console.log(`Catalog Categories API Response (${doorMode}):`, response.data);
      return response.data as ClosetCatalogCategory[];
    } catch (error: any) {
      console.error(`Catalog Categories API Error (${doorMode}):`, error.response?.data || error.message);
      throw error;
    }
  }
};
