import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "@/config/api";

export const useApi = () => {
  const { accessToken, logout, refreshSession } = useAuth();

  const request = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const buildHeaders = (token: string | null) => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      });

      let response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: buildHeaders(accessToken),
      });

      if (response.status === 401) {
        const renewedToken = await refreshSession();
        if (!renewedToken) {
          await logout();
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        response = await fetch(`${API_URL}${path}`, {
          ...options,
          headers: buildHeaders(renewedToken),
        });
      }

      return response;
    },
    [accessToken, logout, refreshSession],
  );

  return { request };
};
