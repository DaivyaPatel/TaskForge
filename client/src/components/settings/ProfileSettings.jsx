import { useState, useRef, useEffect } from 'react';
import { User, Mail, Camera, Lock, Trash2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export const ProfileSettings = () => {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef(null);

  // --- Profile State ---
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // --- Password State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // --- Delete State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if user context updates slowly
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setAvatarPreview(user.avatarUrl);
    }
  }, [user]);

  // --- Handlers ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('displayName', displayName);
    formData.append('email', email);
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
      const { data } = await apiClient.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, ...data.user });
      setProfileMessage({ type: 'success', text: data.message || 'Profile updated successfully.' });
      setAvatarFile(null); // Clear pending upload state
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
    }

    setIsSavingPassword(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      await apiClient.put('/users/me/password', {
        currentPassword,
        newPassword
      });
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await apiClient.delete('/users/me', { data: { password: deletePassword } });
      setUser(null);
      window.location.href = '/register'; // Redirect completely out
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete account. Check your password.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* --- PROFILE INFORMATION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-500" />
            Profile Information
          </h2>
          <p className="text-sm text-slate-500 mt-1">Update your personal details and public avatar.</p>
        </div>
        <div className="p-6">
          {profileMessage.text && (
            <div className={`mb-6 p-3 text-sm rounded-lg border flex items-center gap-2 ${
              profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="flex flex-col sm:flex-row gap-8 mb-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Change Photo
                </button>
              </div>

              {/* Text Fields */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {email !== user?.email && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Changing email requires re-verification.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isSavingProfile}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* --- CHANGE PASSWORD --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-500" />
            Change Password
          </h2>
        </div>
        <div className="p-6">
          {passwordMessage.text && (
            <div className={`mb-6 p-3 text-sm rounded-lg border flex items-center gap-2 ${
              passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input 
                type="password" 
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* --- DANGER ZONE --- */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-6 border-b border-red-200/50">
          <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Danger Zone
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-red-900">Delete Account</h3>
              <p className="text-sm text-red-700 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors whitespace-nowrap"
            >
              Delete Account
            </button>
          </div>

          {showDeleteConfirm && (
            <form onSubmit={handleDeleteAccount} className="mt-4 p-4 bg-white rounded-lg border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Enter your password to confirm deletion:
              </label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current Password"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <button 
                  type="button" 
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Delete
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
};