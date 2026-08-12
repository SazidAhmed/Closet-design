import { router } from "@/router"; // Closet project router path

// Dynamically determine backend URL based on current host
const getBackendURL = () => {
  const currentHost = window.location.hostname;

  if (import.meta.env.MODE === "development") {
    // In development, we use relative /api to let Vite's proxy handle the request
    // This entirely avoids CORS preflight errors in the browser
    return "/api";
  }

  return import.meta.env.VITE_API_BASE_URL ?? "https://api.sierracabinets.us/api";
};

class ApiClient {
  baseURL: string;

  constructor() {
    this.baseURL = getBackendURL();
  }

  async request(method: string, endpoint: string, data?: any, options?: any) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Inject auth token from localStorage if present
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      signal: options?.signal,
      cache: "no-store",
    };

    if (data) {
      // Basic support for JSON (FormData would need headers['Content-Type'] removed like in axios)
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Redirect to unauthorized since Closet relies on external auth tokens
        router.push("/unauthorized");
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
      }

      const responseData = await response.json().catch(() => null);
      
      // Return in an axios-like shape so services don't need to change
      return { data: responseData, status: response.status };
    } catch (error) {
      console.error("Network error or request blocked:", error);
      throw error;
    }
  }

  get(endpoint: string, options?: any) {
    return this.request("GET", endpoint, undefined, options);
  }

  post(endpoint: string, data?: any, options?: any) {
    return this.request("POST", endpoint, data, options);
  }
}

const apiClient = new ApiClient();
export default apiClient;

