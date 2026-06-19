import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSocketStore } from '../store/socketStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { useSocket } from '../hooks/useSocket';

export const AppLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { connect, disconnect, isConnected } = useSocketStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        onCloseMobile={() => setIsMobileOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Persistent Top Navigation */}
        <TopBar onOpenMobile={() => setIsMobileOpen(true)} />

        {/* Dynamic Page Content (e.g., WorkspaceView) */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
        
      </div>

      {/* Offline Banner */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs py-1 text-center flex items-center justify-center gap-2 z-[60]">
          <WifiOff className="w-3 h-3" />
          You are offline. Reconnecting...
        </div>
      )}

    </div>
  );
};

export const DashboardLayout = () => {
  // Assuming you have state/functions for these somewhere in your component or Zustand store
  const openSearch = () => console.log('Opening Search Modal...');
  const openNewTask = () => console.log('Opening New Task Modal...');
  const toggleStatus = () => console.log('Toggling selected task status...');
  const closeEverything = () => console.log('Closing all modals/drawers...');
  const showShortcutsMenu = () => console.log('Showing Cheat Sheet...');

  // Wire up the hook!
  useKeyboard({
    'cmd+k': openSearch,
    'n': openNewTask,
    'space': toggleStatus,
    'escape': closeEverything,
    'arrowup': () => console.log('Navigating Up...'),
    'arrowdown': () => console.log('Navigating Down...'),
    'cmd+/': showShortcutsMenu,
  });

  return (
    <div>
       {/* Your dashboard UI */}
    </div>
  );
};

export const AppLayout = ({ children }) => {
  const socket = useSocket(); // Or however you get your socket instance

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Network UI goes at the very top level */}
      <NetworkIndicator socket={socket} />
      
      {/* The rest of your app (Sidebar, TopBar, Main Content) */}
      <div className="flex">
        {/* ... */}
      </div>
    </div>
  );
};