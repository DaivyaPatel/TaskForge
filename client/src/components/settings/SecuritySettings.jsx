import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Copy, Download, CheckCircle2, Loader2, Key } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore'; // Assuming you have a zustand/context store

export const SecuritySettings = () => {
  const { user, setUser } = useAuthStore(); // Adjust based on your auth state management
  const [step, setStep] = useState('idle'); // 'idle', 'setup', 'backup', 'disable'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2FA Setup State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  // Disable State
  const [currentPassword, setCurrentPassword] = useState('');

  const handleInitiateSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/totp/setup');
      setQrCodeUrl(data.qrCodeUrl);
      setManualSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.error || "Failed to initiate 2FA setup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/totp/verify', { token: verificationCode });
      setUser({ ...user, totpEnabled: true });
      setStep('backup');
    } catch (err) {
      setError(err.response?.data?.error || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // NOTE: We will need to add this endpoint to the backend in the next step
      await apiClient.post('/totp/disable', { password: currentPassword });
      setUser({ ...user, totpEnabled: false });
      setStep('idle');
      setCurrentPassword('');
    } catch (err) {
      setError(err.response?.data?.error || "Failed to disable 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = `TaskForge Backup Codes\n\n${backupCodes.join('\n')}\n\nKeep these safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskforge-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    alert("Backup codes copied to clipboard!");
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Key className="w-5 h-5 text-slate-500" />
          Security Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage your account security and two-factor authentication.</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* --- IDLE STATE --- */}
        {step === 'idle' && (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-4">
              {user?.totpEnabled ? (
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-10 h-10 text-amber-500" />
              )}
              <div>
                <h3 className="font-semibold text-slate-700">Two-Factor Authentication (2FA)</h3>
                <p className="text-sm text-slate-500">
                  {user?.totpEnabled 
                    ? "Your account is secured with 2FA." 
                    : "Add an extra layer of security to your account."}
                </p>
              </div>
            </div>
            {user?.totpEnabled ? (
              <button 
                onClick={() => setStep('disable')}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                Disable
              </button>
            ) : (
              <button 
                onClick={handleInitiateSetup}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enable 2FA
              </button>
            )}
          </div>
        )}

        {/* --- SETUP STATE (QR Code) --- */}
        {step === 'setup' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">Configure Authenticator App</h3>
            <p className="text-sm text-slate-600">
              1. Scan this QR code with an authenticator app (like Google Authenticator, Authy, or 1Password).
            </p>
            
            <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-lg inline-block mx-auto">
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />}
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Can't scan the code? Enter this key manually:</p>
              <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-mono tracking-wider">
                {manualSecret}
              </code>
            </div>

            <form onSubmit={handleVerifySetup} className="pt-4 border-t border-slate-100">
              <label className="block text-sm text-slate-600 mb-2">
                2. Enter the 6-digit code generated by your app:
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full max-w-[200px] px-4 py-2 text-center tracking-[0.5em] text-lg font-mono border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- BACKUP CODES STATE --- */}
        {step === 'backup' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">2FA is now enabled!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              If you lose your device, you will need these backup codes to access your account. 
              <strong> Save them now. You will not see them again.</strong>
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left bg-slate-50 p-4 rounded-lg border border-slate-200">
              {backupCodes.map((code, i) => (
                <code key={i} className="font-mono text-sm text-slate-700">{code}</code>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              <button onClick={copyBackupCodes} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button onClick={downloadBackupCodes} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Download className="w-4 h-4" /> Download .txt
              </button>
            </div>

            <div className="pt-6">
              <button onClick={() => setStep('idle')} className="px-6 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800">
                I have saved my backup codes
              </button>
            </div>
          </div>
        )}

        {/* --- DISABLE STATE --- */}
        {step === 'disable' && (
          <form onSubmit={handleDisable2FA} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Disable Two-Factor Authentication</h3>
            <p className="text-sm text-slate-600">
              Disabling 2FA will make your account less secure. Please enter your password to confirm.
            </p>

            <div>
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={isLoading || !currentPassword}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
              </button>
              <button 
                type="button" 
                onClick={() => { setStep('idle'); setCurrentPassword(''); setError(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};