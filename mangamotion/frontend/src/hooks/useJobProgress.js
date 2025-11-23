import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * useJobProgress Hook
 * 
 * Provides real-time job progress updates via WebSocket
 * Falls back to polling if WebSocket unavailable
 */
export function useJobProgress(jobId, accessToken, options = {}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('queued');
  const [stage, setStage] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [usingWebSocket, setUsingWebSocket] = useState(false);

  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const {
    pollInterval = 2000,
    wsUrl = null,
    enablePolling = true,
    enableWebSocket = true
  } = options;

  /**
   * Connect to WebSocket
   */
  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket || !jobId || !accessToken) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = wsUrl || `${protocol}//${window.location.host}/ws?token=${accessToken}`;

      console.log(`[useJobProgress] Connecting to WebSocket: ${url}`);

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[useJobProgress] WebSocket connected');
        setIsConnected(true);
        setUsingWebSocket(true);
        setError(null);

        // Subscribe to job updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { jobId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            console.log(`[useJobProgress] Progress update: ${data.progress}%`);
            setProgress(data.progress);
            setStatus(data.status);
            setStage(data.stage);
            setMessage(data.message);
          } else if (data.type === 'connected') {
            console.log('[useJobProgress] Connected to server');
          } else if (data.type === 'subscribed') {
            console.log(`[useJobProgress] Subscribed to job ${data.jobId}`);
          } else if (data.type === 'error') {
            console.error(`[useJobProgress] Server error: ${data.error}`);
            setError(data.error);
          }
        } catch (err) {
          console.error(`[useJobProgress] Message parse error: ${err.message}`);
        }
      };

      ws.onerror = (err) => {
        console.error('[useJobProgress] WebSocket error:', err);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[useJobProgress] WebSocket closed');
        setIsConnected(false);
        setUsingWebSocket(false);

        // Attempt to reconnect after delay
        if (enableWebSocket && status !== 'completed' && status !== 'failed') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[useJobProgress] Attempting to reconnect...');
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[useJobProgress] WebSocket connection error: ${err.message}`);
      setError('Failed to connect to WebSocket');
      setUsingWebSocket(false);
    }
  }, [jobId, accessToken, wsUrl, enableWebSocket, status]);

  /**
   * Fetch job progress via HTTP polling
   */
  const pollProgress = useCallback(async () => {
    if (!jobId || !accessToken) {
      return;
    }

    try {
      const response = await fetch(`/api/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setProgress(data.progress || 0);
      setStatus(data.status);
      setError(null);

      // Stop polling when job completes
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error(`[useJobProgress] Poll error: ${err.message}`);
      setError(`Poll error: ${err.message}`);
    }
  }, [jobId, accessToken]);

  /**
   * Setup effect
   */
  useEffect(() => {
    if (!jobId) {
      return;
    }

    // Try WebSocket first
    if (enableWebSocket) {
      connectWebSocket();
    }

    // Setup polling as fallback
    if (enablePolling && !usingWebSocket) {
      console.log('[useJobProgress] Starting polling');
      pollProgress(); // Initial poll
      pollIntervalRef.current = setInterval(pollProgress, pollInterval);
    }

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [jobId, enableWebSocket, enablePolling, pollInterval, connectWebSocket, pollProgress, usingWebSocket]);

  return {
    progress,
    status,
    stage,
    message,
    error,
    isConnected,
    usingWebSocket
  };
}
