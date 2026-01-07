import { useState, useEffect } from 'react';

interface VersionInfo {
  buildTimestamp: number;
}

const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useVersionCheck = (checkInterval: number = DEFAULT_CHECK_INTERVAL_MS) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Load the initial version
    const abortController = new AbortController();
    
    const loadInitialVersion = async () => {
      try {
        const response = await fetch('/version.json', { signal: abortController.signal });
        if (!response.ok) {
          console.error('Failed to load initial version: HTTP', response.status);
          return;
        }
        const version = await response.json();
        setCurrentVersion(version);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Failed to load initial version:', error);
      }
    };

    loadInitialVersion();
    
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (!currentVersion) return;

    const abortController = new AbortController();

    const checkForUpdate = async () => {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`/version.json?t=${Date.now()}`, { signal: abortController.signal });
        if (!response.ok) {
          console.error('Failed to check for updates: HTTP', response.status);
          return;
        }
        const serverVersion = await response.json();

        // Validate server version structure
        if (!serverVersion || typeof serverVersion.buildTimestamp !== 'number') {
          console.error('Invalid version data from server:', serverVersion);
          return;
        }

        // Compare build timestamps: only treat strictly newer versions as updates
        if (serverVersion.buildTimestamp > currentVersion.buildTimestamp) {
          setHasUpdate(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Failed to check for updates:', error);
      }
    };

    // Set up periodic checking without immediate check
    const interval = setInterval(checkForUpdate, checkInterval);

    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [currentVersion, checkInterval]);

  const refreshPage = () => {
    window.location.reload();
  };

  const dismissUpdate = () => {
    setHasUpdate(false);
  };

  return { hasUpdate, refreshPage, dismissUpdate };
};
