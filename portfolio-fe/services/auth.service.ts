import apiClient from "@/lib/axios";

export const authService = {
  login: (email: string, password: string): Promise<{ accessToken: string }> =>
    apiClient.post("/admin/login", { email, password }).then((r) => r.data),
};
