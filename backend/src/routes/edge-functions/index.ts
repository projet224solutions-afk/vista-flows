/**
 * EDGE FUNCTIONS INDEX
 * Central routing for all migrated Edge Functions
 * 
 * Structure:
 * /edge-functions/auth/*        - Authentication (13 functions)
 * /edge-functions/payments/*    - Payments & Escrow (45 functions)
 * /edge-functions/users/*       - User Management (28 functions)
 * /edge-functions/ai/*          - AI/ML (14 functions)
 * /edge-functions/files/*       - File Generation (13 functions)
 * /edge-functions/webhooks/*    - External webhooks (9+ functions)
 * /edge-functions/products/*    - Product Management (14 functions)
 * /edge-functions/orders/*      - Order Management (9 functions)
 * /edge-functions/analytics/*   - Analytics & Monitoring (20+ functions)
 * /edge-functions/misc/*        - Other functions (60+ functions)
 */

import { Router } from "express";

// Import sub-routers
import authRoutes from "./auth.routes.js";
import paymentsRoutes from "./payments.routes.js";
// Import others as they are created
// import usersRoutes from "./users.routes.js";
// import aiRoutes from "./ai.routes.js";
// ... and so on

const router = Router();

/**
 * Mount all Edge Functions routes
 * These are migrated from Supabase Edge Functions
 */
router.use("/auth", authRoutes);
router.use("/payments", paymentsRoutes);
// router.use("/users", usersRoutes);
// router.use("/ai", aiRoutes);
// router.use("/files", filesRoutes);
// router.use("/webhooks", webhooksRoutes);
// router.use("/products", productsRoutes);
// router.use("/orders", ordersRoutes);
// router.use("/analytics", analyticsRoutes);

/**
 * Health check for Edge Functions layer
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Edge Functions proxy is healthy",
    migrated_categories: [
      "auth (13/13)",
      "payments (45/45)",
      // "users (0/28)",
      // "ai (0/14)",
      // ... others
    ],
  });
});

export default router;
