import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
// Import your auth store (adjust the path if yours is named differently)
import { useAuthStore } from '../store/useAuthStore'; 

export const Login = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Grab the actual login function from your Zustand store
  const login = useAuthStore((state) => state.login);
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  // Figure out where to send them after logging in (defaults to dashboard)
  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    setError(null);
    try {
      // Call your actual backend via the Zustand store
      await login(data.email, data.password);
      
      // Send them to the page they were trying to visit, or the dashboard
      navigate(from, { replace: true }); 
    } catch (err) {
      // Show a clean error to the user if they type the wrong password
      setError(err.response?.data?.message || "Failed to log in. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">TaskForge</h1>
          <p className="text-slate-500">Welcome back! Log in to your account.</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register('email', { required: true })}
              type="email"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              {...register('password', { required: true })}
              type="password"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-2 px-4 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
          </button>
        </form>

        {/* Link back to Register */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up
          </Link>
        </div>

      </div>
    </div>
  );
};