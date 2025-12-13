// API Configuration
// This file handles API URL configuration for different environments

/**
 * Get the API base URL
 * Priority:
 * 1. REACT_APP_API_URL environment variable
 * 2. Auto-detect based on current host (for local network access from mobile)
 * 3. Default to localhost:3001
 */
const getApiUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Auto-detect: If accessing from a non-localhost domain (e.g., from mobile on local network)
  // use the same host as the React app with port 3001
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // If not localhost, assume we're on the same network and use the hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001/api`;
    }
  }

  // Default to localhost for development
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiUrl();

// Log the API URL in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}
