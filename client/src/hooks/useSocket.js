import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (url = 'http://localhost:5000') => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(url, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Join user room for notifications
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        newSocket.emit('join-user', user.id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url]);

  return { socket, connected };
};

export default useSocket;

