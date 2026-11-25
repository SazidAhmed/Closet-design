import http from "../http-common";
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
  },

  /**
   * Fetch custom parts list from the backend.
   *
   * @throws if the network request fails or the server returns a non-OK status.
   */
  async getCustomParts(): Promise<any[]> {
    try {
      const response = await http.get(`/customPartsList`);
      return response.data.parts || [];
    } catch (error: any) {
      console.error(`Custom Parts API Error:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get all closets designed by the authenticated user.
   */
  async getClosets(): Promise<any[]> {
    try {
      const response = await http.get(`/closets`);
      return response.data?.data || [];
    } catch (error: any) {
      console.error(`Get Closets API Error:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get a single closet design by ID.
   */
  async getClosetById(id: string): Promise<any> {
    try {
      const response = await http.get(`/closets/${id}`);
      return response.data?.data;
    } catch (error: any) {
      console.error(`Get Closet By ID API Error:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Save (create or update) a closet design with its shelves/towers.
   */
  async saveCloset(payload: any): Promise<any> {
    try {
      const response = await http.post(`/closets`, payload);
      return response.data?.data;
    } catch (error: any) {
      console.error(`Save Closet API Error:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Delete a closet design by ID.
   */
  async deleteCloset(id: string): Promise<any> {
    try {
      const response = await http.delete(`/closets/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Delete Closet API Error:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Bulk sync all closets between frontend and backend.
   */
  async syncClosets(closets: any[]): Promise<any[]> {
    try {
      const response = await http.post(`/closets/sync`, { closets });
      return response.data?.data || [];
    } catch (error: any) {
      console.error(`Sync Closets API Error:`, error.response?.data || error.message);
      throw error;
    }
  }
};
