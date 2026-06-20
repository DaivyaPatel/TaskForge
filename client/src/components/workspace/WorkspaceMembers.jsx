import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, Shield, X, Loader2, Mail, Trash2 } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export const WorkspaceMembers = () => {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  
  const [members, setMembers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [isInviting, setIsInviting] = useState(false);
  
  // Remove State
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data } = await apiClient.get(`/workspaces/${workspaceId}/members`);
        setMembers(data);

        const me = data.find(m => m.userId === user.id);
        if (me) setCurrentUserRole(me.role);
      } catch (error) {
        console.error("Failed to fetch members", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [workspaceId, user.id]);

  const fetchMembers = async () => {
    try {
      const { data } = await apiClient.get(`/workspaces/${workspaceId}/members`);
      setMembers(data);

      const me = data.find(m => m.userId === user.id);
      if (me) setCurrentUserRole(me.role);
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      await apiClient.post(`/workspaces/${workspaceId}/invites`, {
        email: inviteEmail,
        role: inviteRole
      });
      setInviteEmail('');
      setInviteRole('VIEWER');
      fetchMembers(); // Refresh the list
    } catch (error) {
      alert(error.response?.data?.error || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await apiClient.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role: newRole });
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (error) {
      alert(error.response?.data?.error || "Failed to change role");
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      setConfirmRemove(null);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const canInvite = currentUserRole === 'OWNER' || currentUserRole === 'EDITOR';
  const isOwner = currentUserRole === 'OWNER';

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">Workspace Members</h2>
        <p className="text-sm text-slate-500 mt-1">Manage who has access to this workspace and their permissions.</p>
      </div>

      {canInvite && (
        <form onSubmit={handleInvite} className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="email" 
                required 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com" 
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
            <select 
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="VIEWER">Viewer</option>
              {isOwner && (
                <>
                  <option value="EDITOR">Editor</option>
                  <option value="OWNER">Owner</option>
                </>
              )}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={isInviting || !inviteEmail}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Invite
          </button>
        </form>
      )}

      <div className="space-y-3">
        {members.map(member => (
          <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                {member.user?.avatarUrl ? (
                  <img src={member.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  member.user?.displayName?.charAt(0) || '?'
                )}
              </div>
              <div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  {member.user?.displayName}
                  {member.userId === user.id && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">You</span>}
                </div>
                <div className="text-sm text-slate-500">{member.user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Dropdown vs Badge */}
              {isOwner && member.userId !== user.id ? (
                <select 
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="text-sm border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                  <option value="OWNER">Owner</option>
                </select>
              ) : (
                <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                  member.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                  member.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  <Shield className="w-3 h-3" /> {member.role}
                </span>
              )}

              {/* Remove User Action */}
              {(isOwner || (currentUserRole === 'EDITOR' && member.role === 'VIEWER')) && member.userId !== user.id && (
                <>
                  {confirmRemove === member.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                      <button onClick={() => handleRemove(member.id)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-medium">Remove</button>
                      <button onClick={() => setConfirmRemove(null)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemove(member.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove User">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};