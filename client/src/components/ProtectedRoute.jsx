import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAppReady = useAuthStore((state) => state.isAppReady);

  const location = useLocation();

  if (!isAppReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};