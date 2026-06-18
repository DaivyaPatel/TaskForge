import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Inbox, CalendarDays, 
  LayoutGrid, Settings, Plus, X 
} from 'lucide-react';
import apiClient from '../api/client';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await apiClient.get('/workspaces');
        setWorkspaces(res.data);
      } catch (error) {
        console.error("Failed to load workspaces", error);
      }
    };
    fetchWorkspaces();
  }, []);

  const sidebarClasses = `
    flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out z-30
    ${isCollapsed ? 'w-14' : 'w-60'}
    fixed inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={sidebarClasses}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 flex-shrink-0">
          {!isCollapsed && (
            <span className="font-bold text-slate-900 truncate px-1">TaskForge</span>
          )}
          
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 text-slate-400 hover:bg-slate-200 rounded-md ml-auto"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          
          {/* Mobile Close Button */}
          <button onClick={onCloseMobile} className="md:hidden p-1.5 text-slate-400 hover:bg-slate-200 rounded-md ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 px-2">
          
          {/* Smart Views */}
          <div className="space-y-1">
            <NavItem icon={<Inbox />} label="Inbox" isCollapsed={isCollapsed} />
            <NavItem icon={<CalendarDays />} label="My Tasks" isCollapsed={isCollapsed} />
            <NavItem icon={<LayoutGrid />} label="Board" isCollapsed={isCollapsed} />
          </div>

          {/* Workspaces List */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Workspaces</span>
                <button className="hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="space-y-1">
              {workspaces.map(ws => (
                <NavLink 
                  key={ws.id} 
                  to={`/w/${ws.id}`}
                  onClick={() => onCloseMobile()} // Close drawer on mobile click
                  className={({ isActive }) => `
                    flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors
                    ${isActive ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? ws.name : ''}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: ws.color || '#3b82f6' }}
                  />
                  {!isCollapsed && <span className="text-sm truncate">{ws.name}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-200">
          <NavItem icon={<Settings />} label="Settings" isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
};

// Reusable Helper Component for static links
const NavItem = ({ icon, label, isCollapsed }) => (
  <button 
    className={`w-full flex items-center gap-3 px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors ${isCollapsed ? 'justify-center' : ''}`}
    title={isCollapsed ? label : ''}
  >
    <div className="text-slate-400 [&>svg]:w-4 [&>svg]:h-4">
      {icon}
    </div>
    {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
  </button>
);