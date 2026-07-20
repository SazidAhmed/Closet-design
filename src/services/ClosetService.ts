import http from "@/http-common";
import { type ClosetCatalogCategory, type ClosetDoorMode } from "../features/closet/domain/closetCatalogs";

export default {
  /**
   * Fetch closet catalog categories for the given door mode from the backend.
   *
   * @throws if the network request fails or the server returns a non-OK status.
   */
  async getCatalogCategories(doorMode: ClosetDoorMode): Promise<ClosetCatalogCategory[]> {
    // We send doorMode as a query param
    const response = await http.get(`/closet/catalog-categories?doorMode=${doorMode}`);
    console.log(`Catalog Categories API Response (${doorMode}):`, response.data);
    return response.data as ClosetCatalogCategory[];
  }
};
