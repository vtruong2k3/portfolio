"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/axios";

/**
 * Login mutation — stores token on success (Req 23.2, Property 26).
 */
export function useLogin() {
  const setToken = useAuthStore((s) => s.setToken);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
    },
    onError: (err) => {
      console.error("Login failed:", getApiErrorMessage(err));
    },
  });
}
