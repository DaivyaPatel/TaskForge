import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuthStore } from '../store/authStore';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const Register = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const registerAccount = useAuthStore((state) => state.register);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const passwordScore = password ? zxcvbn(password).score : 0;
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'];

  const onSubmit = async (data) => {
    setError(null);
    try {
      const response = await registerAccount(data);
      navigate('/login', {
        replace: true,
        state: {
          message: response.message || 'Please check your email to verify your account.',
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
        <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
        <p className="text-sm text-slate-500 mt-2">Get started with TaskForge today.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input
            {...register('displayName')}
            className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jane Doe"
          />
          {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="jane@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}

          {password.length > 0 && (
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-300 ${strengthColors[passwordScore]}`}
                style={{ width: `${(passwordScore + 1) * 20}%` }}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white p-2 rounded-md hover:bg-slate-800 flex justify-center items-center transition-colors disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Log in
        </Link>
      </div>
    </AuthLayout>
  );
};