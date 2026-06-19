import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSocketStore } from '../store/socketStore';

export const AppLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { connect, disconnect, isConnected } = useSocketStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobile={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs py-1 text-center flex items-center justify-center gap-2 z-[60]">
          <WifiOff className="w-3 h-3" />
          You are offline. Reconnecting...
        </div>
      )}
    </div>
  );
};