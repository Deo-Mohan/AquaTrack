import { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';

/**
 * Custom React Hook for Real-Time WebSocket Alerts & Notifications
 */
export function useWebSocketAlerts(onNotificationReceived) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const getWsUrl = () => {
      if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
      if (import.meta.env.PROD) return 'wss://aquatrack-esq6.onrender.com/ws-aquatrack';
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      return `ws://${host}:8080/ws-aquatrack`;
    };

    // Initialize STOMP WebSocket Client
    const stompClient = new Client({
      brokerURL: getWsUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: function (str) {
        // Console debug log for dev monitoring
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = (frame) => {
      setConnected(true);
      
      // Subscribe to community announcements
      stompClient.subscribe('/topic/announcements', (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            if (onNotificationReceived) onNotificationReceived(data);
          } catch (e) {
            console.log("WebSocket payload format:", message.body);
          }
        }
      });
    };

    stompClient.onDisconnect = () => {
      setConnected(false);
    };

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [onNotificationReceived]);

  return { connected };
}
