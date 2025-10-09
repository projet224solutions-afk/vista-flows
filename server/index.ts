import express from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

const app = express();

// Trust proxy for rate limiting behind reverse proxy (Replit)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Pour Vite dev
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mapbox.com", "wss:", "ws:"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://224solutions.com']
    : ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = 5000;

(async () => {
  try {
    // Import global limiter
    const { globalLimiter } = await import("./middleware/rateLimiter.js");
    app.use(globalLimiter);
    
    registerRoutes(app);
    await setupVite(app);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Visit: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
})();
