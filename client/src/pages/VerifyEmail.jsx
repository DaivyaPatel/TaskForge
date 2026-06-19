import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Assuming react-router
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';

export const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // TODO: Replace with your actual API call
        const res = await fetch(`/api/v1/auth/verify-email/${token}`, { method: 'POST' });
        
        if (res.ok) {
          setStatus('success');
          setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3s
        } else {
          setStatus('error');
        }
      } catch (_err) {
        setStatus('error');
      }
    };

    if (token) verifyToken();
  }, [token, navigate]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-slate-500" />
            <h2 className="text-2xl font-bold">Verifying your email...</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
            <p className="text-slate-500">Redirecting you to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500" />
            <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
            <p className="text-slate-500">The link may be invalid or expired.</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};