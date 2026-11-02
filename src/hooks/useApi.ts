import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "@/config/api";

const REQUEST_TIMEOUT_MS = 10000;

export const useApi = () => {
  const { accessToken, logout, refreshSession } = useAuth();

  const request = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const buildHeaders = (token: string | null) => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      });

      const fetchWithTimeout = async (token: string | null) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const signal = options.signal ?? controller.signal;

        try {
          return await fetch(`${API_URL}${path}`, {
            ...options,
            signal,
            headers: buildHeaders(token),
          });
        } catch (err: any) {
          if (err?.name === "AbortError") {
            throw new Error("O servidor demorou para responder. Verifique sua conexão.");
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      };

      let response = await fetchWithTimeout(accessToken);

      if (response.status === 401) {
        const renewedToken = await refreshSession();
        if (!renewedToken) {
          await logout();
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        response = await fetchWithTimeout(renewedToken);
      }

      return response;
    },
    [accessToken, logout, refreshSession],
  );

  return { request };
};