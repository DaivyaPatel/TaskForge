import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';

export const useSocketEvent = (event, callback) => {
  const socket = useSocketStore(state => state.socket);

  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    // Cleanup listener on unmount
    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
};