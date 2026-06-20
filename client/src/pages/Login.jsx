import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const inputClassName =
  'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const submitButtonClassName =
  'w-full flex items-center justify-center py-2 px-4 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-70';

export const Login = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(() => location.pathname === '/login');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message ?? null);
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const registerAccount = useAuthStore((state) => state.register);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const from = location.state?.from?.pathname || '/dashboard';

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setError(null);
    setSuccessMessage(null);
    reset();
  };

  const onLoginSubmit = async (data) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to log in. Please check your credentials.'
      );
    }
  };

  const onSignupSubmit = async (data) => {
    setError(null);
    try {
      const response = await registerAccount({
        email: data.email,
        password: data.password,
        displayName: data.name,
      });
      reset();
      setIsLogin(true);
      setSuccessMessage(
        response.message || 'Account created successfully! Please check your email to verify your account.'
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create account. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">TaskForge</h1>
          <p className="text-slate-500">
            {isLogin ? 'Welcome back! Log in to your account.' : 'Create your account to get started.'}
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-100">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email', { required: true })}
                type="email"
                className={inputClassName}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                {...register('password', { required: true })}
                type="password"
                className={inputClassName}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={submitButtonClassName}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSignupSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                {...register('name', { required: true })}
                type="text"
                className={inputClassName}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email', { required: true })}
                type="email"
                className={inputClassName}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                {...register('password', { required: true, minLength: 8 })}
                type="password"
                className={inputClassName}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={submitButtonClassName}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
