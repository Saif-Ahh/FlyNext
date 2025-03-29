// API URL Configuration
const API_URL = typeof window !== 'undefined'
    ? '' // Empty base URL for client-side requests (relative URLs)
    : 'http://localhost:3000'; // Only used server-side

export default API_URL; 