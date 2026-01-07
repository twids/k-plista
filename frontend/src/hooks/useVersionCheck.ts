import { useState, useEffect } from 'react';

interface VersionInfo {
  buildTime: string;
  buildTimestamp: number;
}

export const useVersionCheck = (checkInterval: number = 5 * 60 * 1000) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Load the initial version
    const loadInitialVersion = async () => {
      try {
        const response = await fetch('/version.json');
        const version = await response.json();
        setCurrentVersion(version);
      } catch (error) {
        console.error('Failed to load initial version:', error);
      }
    };

    loadInitialVersion();
  }, []);

  useEffect(() => {
    if (!currentVersion) return;

    const checkForUpdate = async () => {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`/version.json?t=${Date.now()}`);
        const serverVersion = await response.json();

        // Compare build timestamps
        if (serverVersion.buildTimestamp !== currentVersion.buildTimestamp) {
          setHasUpdate(true);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Check immediately
    checkForUpdate();

    // Set up periodic checking
    const interval = setInterval(checkForUpdate, checkInterval);

    return () => clearInterval(interval);
  }, [currentVersion, checkInterval]);

  const refreshPage = () => {
    window.location.reload();
  };

  return { hasUpdate, refreshPage };
};
