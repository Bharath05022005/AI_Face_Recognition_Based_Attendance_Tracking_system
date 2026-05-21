const API_BASE_URL = "http://127.0.0.1:8000/api";

class ApiService {
    static getHeaders() {
        const token = localStorage.getItem("access_token");
        const headers = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = this.getHeaders();
        
        // Merge headers
        options.headers = {
            ...headers,
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, options);
            
            // Handle automatic logout on 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("admin_user");
                window.location.reload();
                throw new Error("Session expired. Please log in again.");
            }

            // Check if downloading a blob file (e.g. excel export)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("spreadsheetml")) {
                return await response.blob();
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || "Something went wrong.");
            }
            
            return data;
        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    }

    static get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: "GET" });
    }

    static post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    static put(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "PUT",
            body: JSON.stringify(body)
        });
    }

    static delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: "DELETE" });
    }
}

export default ApiService;
