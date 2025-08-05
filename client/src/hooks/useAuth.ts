import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User, LoginData } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      try {
        // Use apiRequest to ensure the correct base URL is used
        const response = await apiRequest("GET", "/api/auth/me");
        return await response.json();
      } catch (error: any) {
        // If the error is a 401, it's an expected "not logged in" state
        if (error.message.includes("401")) {
          return null;
        }
        // For other errors, log them
        console.error("Auth check failed:", error);
        return null;
      }
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate auth queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries(); // Refresh all data after login
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return await response.json();
    },
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  return {
    user: authData?.user,
    isLoading,
    isAuthenticated: !!authData?.user,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
