import { Search, Menu, User } from 'lucide-react';
import { useSocketStore } from '../store/socketStore';
import { NotificationBell } from '../components/layout/NotificationBell'; // <-- Imported the new component

export const TopBar = ({ onOpenMobile }) => {
  // Pull the active users from our global socket store
  const activeUsers = useSocketStore(state => state.activeUsers);

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 flex-shrink-0 z-20">
      {/* Left side: Mobile Menu Toggle & Brand (hidden on desktop) */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenMobile}
          className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Placeholder for Breadcrumbs or Page Title if needed */}
        <div className="hidden md:flex items-center text-sm font-medium text-slate-700">
          TaskForge
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* --- PRESENCE INDICATORS --- */}
        {activeUsers.length > 0 && (
          <div className="hidden sm:flex items-center mr-2 border-r border-slate-200 pr-4">
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  title={`${user.displayName || 'Someone'} is viewing now`}
                  className="w-8 h-8 rounded-full ring-2 ring-white bg-blue-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden cursor-default transition-transform hover:z-10 hover:-translate-y-1"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (user.displayName || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              
              {/* +N Overflow Indicator */}
              {activeUsers.length > 3 && (
                <div 
                  title={`${activeUsers.length - 3} more viewing`}
                  className="w-8 h-8 rounded-full ring-2 ring-white bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium z-10 cursor-default"
                >
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Trigger (Mockup for now) */}
        <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md text-sm transition-colors border border-slate-200 w-48 sm:w-64">
          <Search className="w-4 h-4" />
          <span className="text-xs">Search...</span>
          <span className="ml-auto text-[10px] font-semibold border border-slate-200 px-1 rounded bg-white">Ctrl K</span>
        </button>

        {/* --- REAL-TIME NOTIFICATION BELL --- */}
        <NotificationBell />

        {/* User Avatar Dropdown (Mockup) */}
        <button className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium hover:ring-2 ring-offset-2 ring-slate-900 transition-all ml-1 shrink-0">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};