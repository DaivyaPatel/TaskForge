import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email').max(100, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const Auth = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const registerAccount = useAuthStore((state) => state.register);

  // Login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Signup form
  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const password = signupForm.watch('password', '');
  const confirmPassword = signupForm.watch('confirmPassword', '');
  const passwordScore = password ? zxcvbn(password).score : -1;
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    loginForm.reset();
    signupForm.reset();
  };

  const onLoginSubmit = async (data) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
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
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      });
      navigate('/login', {
        replace: true,
        state: {
          message: response.message || 'Account created successfully! Please check your email to verify your account.',
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create account. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">TaskForge</h1>
          <p className="text-blue-100">Manage your tasks efficiently</p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              mode === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => handleModeChange('signup')}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              mode === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start">
              <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    loginForm.formState.errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="jane@example.com"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    {...loginForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 ${
                      loginForm.formState.errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6"
              >
                {loginForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  {...signupForm.register('displayName')}
                  type="text"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    signupForm.formState.errors.displayName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Jane Doe"
                />
                {signupForm.formState.errors.displayName && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {signupForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  {...signupForm.register('email')}
                  type="email"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    signupForm.formState.errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="jane@example.com"
                />
                {signupForm.formState.errors.email && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    {...signupForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 ${
                      signupForm.formState.errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {signupForm.formState.errors.password && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {signupForm.formState.errors.password.message}
                  </p>
                )}

                {password.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${strengthColors[passwordScore]}`}
                        style={{ width: `${(passwordScore + 1) * 20}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Strength: <span className="font-semibold">{strengthLabels[passwordScore]}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    {...signupForm.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 ${
                      signupForm.formState.errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="mt-1.5">
                    {passwordsMatch ? (
                      <p className="text-green-600 text-xs flex items-center">
                        <Check className="w-3 h-3 mr-1" />
                        Passwords match
                      </p>
                    ) : (
                      <p className="text-red-600 text-xs flex items-center">
                        <X className="w-3 h-3 mr-1" />
                        Passwords don't match
                      </p>
                    )}
                  </div>
                )}

                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={signupForm.formState.isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6"
              >
                {signupForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
