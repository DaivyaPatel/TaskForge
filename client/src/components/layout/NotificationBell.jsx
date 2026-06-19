import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, UserPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useSocketEvent } from '../../hooks/useSocket';

// Helper to pick an icon based on notification type
const getNotificationIcon = (type) => {
  switch (type) {
    case 'WORKSPACE_INVITE': return <UserPlus className="w-4 h-4 text-purple-500" />;
    case 'TASK_ASSIGNED': return <FileText className="w-4 h-4 text-blue-500" />;
    case 'DUE_DATE_REMINDER': return <Clock className="w-4 h-4 text-amber-500" />;
    case 'COMMENT_ADDED': return <FileText className="w-4 h-4 text-emerald-500" />;
    default: return <Bell className="w-4 h-4 text-slate-500" />;
  }
};

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  // Listen for real-time notifications
  useSocketEvent('notification:new', (newNotif) => {
    setNotifications((prev) => [newNotif, ...prev]);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) => 
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);

    // Routing logic based on notification type
    if (notification.type === 'WORKSPACE_INVITE') {
      navigate('/dashboard'); // Or a specific invites page if you build one
    } else if (notification.taskId) {
      // NOTE: If you need to route to a specific workspace, you may need to fetch the task first to get its workspaceId.
      // For now, we can route to the dashboard or a global task view if you have one.
      navigate(`/dashboard`); 
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">You're all caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No new notifications.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex gap-3 p-4 cursor-pointer transition-colors ${
                      notification.read 
                        ? 'bg-white hover:bg-slate-50' 
                        : 'bg-blue-50/50 hover:bg-blue-50'
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {!notification.read && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};