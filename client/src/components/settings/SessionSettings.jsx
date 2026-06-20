import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Smartphone, Globe, LogOut, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore'; // Adjust if your auth store path differs

// Helper to parse the raw user-agent string into readable text
const parseUserAgent = (ua) => {
  if (!ua) return { device: 'Unknown Device', browser: 'Unknown Browser', Icon: Globe };
  
  const isMobile = /Mobile|Android|iP(hone|od|ad)/i.test(ua);
  const Icon = isMobile ? Smartphone : Laptop;
  
  let browser = 'Web Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('like Mac OS X')) os = 'iOS';

  return { device: os, browser, Icon };
};

export const SessionSettings = () => {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [revokingId, setRevokingId] = useState(null);
  const [confirmingCurrent, setConfirmingCurrent] = useState(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const { data } = await apiClient.get('/sessions');
        setSessions(data);
      } catch (err) {
        setError("Failed to load active sessions.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId, isCurrent) => {
    if (isCurrent && confirmingCurrent !== sessionId) {
      setConfirmingCurrent(sessionId);
      return;
    }

    setRevokingId(sessionId);
    try {
      await apiClient.delete(`/sessions/${sessionId}`);
      
      if (isCurrent) {
        setUser(null);
        navigate('/login', { replace: true });
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setConfirmingCurrent(null);
      }
    } catch (_err) {
      setError("Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirmRevokeAll) {
      setConfirmRevokeAll(true);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.delete('/sessions');
      setUser(null);
      navigate('/login', { replace: true });
    } catch (_err) {
      setError("Failed to log out of all devices.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-500" />
            Active Sessions
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage devices currently logged into your account.
          </p>
        </div>
        
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAll}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              confirmRevokeAll 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-red-50 hover:bg-red-100 text-red-600'
            }`}
          >
            {confirmRevokeAll ? 'Are you sure?' : 'Log out all devices'}
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {isLoading && !revokingId ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const { device, browser, Icon } = parseUserAgent(session.userAgent);
              const isConfirming = confirmingCurrent === session.id;

              return (
                <div 
                  key={session.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors ${
                    session.isCurrent ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4 sm:mb-0">
                    <div className={`p-3 rounded-full ${session.isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        {browser} on {device}
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-600 text-white rounded-full">
                            Current
                          </span>
                        )}
                      </h4>
                      <div className="text-sm text-slate-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                        <span>{session.ipAddress || 'Unknown IP'}</span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span>Signed in: {new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end">
                    {isConfirming ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                        <span className="text-sm font-medium text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Log out now?
                        </span>
                        <button
                          onClick={() => handleRevokeSession(session.id, session.isCurrent)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded shadow-sm"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmingCurrent(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded shadow-sm"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.id, session.isCurrent)}
                        disabled={revokingId === session.id}
                        className={`text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                          session.isCurrent 
                            ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        {session.isCurrent ? 'Log Out' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};