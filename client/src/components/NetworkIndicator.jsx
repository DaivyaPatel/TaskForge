import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
// Import your socket instance here based on your setup
// import { socket } from '../api/socket'; 

export const NetworkIndicator = ({ socket }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSocketDisconnected, setIsSocketDisconnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // --- 1. Browser Network Listeners ---
    const handleOnline = () => {
      setIsOffline(false);
      // Invalidate all caches to pull fresh data the second they get internet back
      queryClient.invalidateQueries();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // --- 2. WebSocket Listeners ---
    if (socket) {
      const onDisconnect = () => setIsSocketDisconnected(true);
      const onConnect = () => {
        setIsSocketDisconnected(false);
        // Double-check we have fresh data if the socket specifically dropped
        queryClient.invalidateQueries(); 
      };

      socket.on('disconnect', onDisconnect);
      socket.on('connect', onConnect);

      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        socket.off('disconnect', onDisconnect);
        socket.off('connect', onConnect);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, socket]);

  // Priority 1: Completely Offline (Red Banner)
  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-sm py-1.5 flex items-center justify-center z-[100] shadow-md transition-all">
        <WifiOff className="w-4 h-4 mr-2" />
        <span className="font-medium">You are offline.</span>
        <span className="ml-1 opacity-90 hidden sm:inline"> Actions are paused until connection is restored.</span>
      </div>
    );
  }

  // Priority 2: Internet works, but Live Updates are broken (Yellow Spinner)
  if (isSocketDisconnected) {
    return (
      <div className="fixed top-0 left-0 w-full bg-amber-500 text-white text-sm py-1.5 flex items-center justify-center z-[100] shadow-md transition-all">
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        <span className="font-medium">Reconnecting to live updates...</span>
      </div>
    );
  }

  // Fully connected!
  return null;
};