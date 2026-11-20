import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchWithApiFallback } from "../config/api";

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
        try {
          return await fetchWithApiFallback(
            path,
            {
              ...options,
              headers: buildHeaders(token),
            },
            REQUEST_TIMEOUT_MS,
          );
        } catch (err: any) {
          if (err?.name === "AbortError") {
            throw new Error("O servidor demorou para responder. Verifique sua conexão.");
          }
          throw err;
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
