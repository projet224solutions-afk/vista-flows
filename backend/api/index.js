// Entry point for Vercel serverless — loads the complete TypeScript server
import { register } from 'tsx/esm/api';

// Register tsx so Node.js can import .ts files
register();

// Dynamic import after tsx is registered
const { default: app } = await import('../src/server.ts');

export default app;
