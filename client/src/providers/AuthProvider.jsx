import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient, { setAccessToken } from '../api/client';
import { Loader2 } from 'lucide-react';

// A quick helper to decode the JWT payload so we can get the User ID and Email
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (_e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const { setAuth, clearAuth, isAppReady } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get a new token automatically using our cookie
        const res = await apiClient.post('/auth/refresh-token');
        const token = res.data.accessToken;
        
        // Pass the token to our Axios interceptor setup from TF-017
        setAccessToken(token);
        
        // Decode the user info from the token and save it to Zustand
        const decoded = decodeJWT(token);
        setAuth({ id: decoded.sub, email: decoded.email }, token);
        
      } catch (_error) {
        // If it fails (no cookie, or expired), just clear the store and load the app as a guest
        clearAuth();
      }
    };

    initAuth();
  }, [setAuth, clearAuth]);

  // Don't render the app until we know if they are logged in or not
  if (!isAppReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-500" />
      </div>
    );
  }

  return children;
};