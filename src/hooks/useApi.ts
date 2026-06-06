import { useAuth } from "../context/AuthContext";

const API_URL = "http://192.168.1.102:3000/api";

export const useApi = () => {
  const { accessToken, logout, refreshSession } = useAuth();

  const request = async (
    path: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    let response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
      const renewed = await refreshSession();
      if (!renewed) {
        await logout();
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    }

    return response;
  };

  return { request };
};
