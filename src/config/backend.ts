/**
 * 🔗 BACKEND CONFIGURATION
 * URL du backend Node.js (Auth Gateway) déployé sur AWS Lambda
 */

export const backendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'https://api.224solution.net',
};
