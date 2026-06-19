import { Navigate, useLocation } from 'react-router-dom';
// Replace this import with wherever your actual Zustand auth store is located
import { useAuthStore } from '../store/useAuthStore'; 

export const ProtectedRoute = ({ children }) => {
  // Grab the auth state from your Zustand store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading); // Optional: if you have a loading state
  
  const location = useLocation();

  // If the app is still checking the cookie, show a blank screen or spinner
  // so it doesn't accidentally kick a logged-in user out while loading
  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  // THE BOUNCER: If they aren't logged in, kick them to the Register page
  if (!isAuthenticated) {
    // We pass `state={{ from: location }}` so that after they register/login, 
    // you can automatically send them back to the exact page they were trying to visit!
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  // If they are logged in, let them through to the layout!
  return children;
};