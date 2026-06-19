import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuthStore } from '../store/authStore';

const signupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email').max(100, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const Signup = () => {
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const registerAccount = useAuthStore((state) => state.register);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');
  const passwordScore = password ? zxcvbn(password).score : -1;
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const onSubmit = async (data) => {
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
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h2>
        <p className="text-sm text-slate-500 mt-2">Join TaskForge and manage your tasks efficiently.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start">
          <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
          <input
            {...register('displayName')}
            type="text"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
              errors.displayName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder="Jane Doe"
          />
          {errors.displayName && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center">
              <X className="w-3 h-3 mr-1" />
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
          <input
            {...register('email')}
            type="email"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder="jane@example.com"
          />
          {errors.email && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center">
              <X className="w-3 h-3 mr-1" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
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

          {errors.password && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center">
              <X className="w-3 h-3 mr-1" />
              {errors.password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${strengthColors[passwordScore]}`}
                  style={{ width: `${(passwordScore + 1) * 20}%` }}
                />
              </div>
              <p className="text-xs text-slate-600">
                Password strength: <span className="font-semibold">{strengthLabels[passwordScore]}</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 ${
                errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
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

          {errors.confirmPassword && (
            <p className="text-red-600 text-xs mt-1.5 flex items-center">
              <X className="w-3 h-3 mr-1" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Login Link */}
      <div className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
          Log in
        </Link>
      </div>

      {/* Terms */}
      <p className="text-xs text-slate-500 text-center mt-6 leading-relaxed">
        By signing up, you agree to our{' '}
        <a href="#" className="hover:text-slate-700 underline">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="hover:text-slate-700 underline">Privacy Policy</a>
      </p>
    </AuthLayout>
  );
};
