import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';

const registerSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const password = watch('password', '');
  const passwordScore = password ? zxcvbn(password).score : 0; // 0 to 4
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'];

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // TODO: Replace with your actual API call
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      // Handle success (e.g., show "Check your email" toast)
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
        <p className="text-sm text-slate-500 mt-2">Get started with TaskForge today.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input 
            {...register('displayName')} 
            className="w-full p-2 border rounded-md"
            placeholder="Jane Doe"
          />
          {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            {...register('email')} 
            className="w-full p-2 border rounded-md"
            placeholder="jane@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password"
            {...register('password')} 
            className="w-full p-2 border rounded-md"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          
          {/* zxcvbn Strength Meter */}
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
          disabled={isLoading}
          className="w-full bg-slate-900 text-white p-2 rounded-md hover:bg-slate-800 flex justify-center items-center"
        >
          {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign Up"}
        </button>
      </form>
    </AuthLayout>
  );
};