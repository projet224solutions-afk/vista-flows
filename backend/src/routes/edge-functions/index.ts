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
import usersRoutes from "./users.routes.js";
import aiRoutes from "./ai.routes.js";
import filesRoutes from "./files.routes.js";
import webhooksRoutes from "./webhooks.routes.js";
import productsRoutes from "./products.routes.js";
import ordersRoutes from "./orders.routes.js";
import usersExtendedRoutes from "./users-extended.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import miscRoutes from "./misc.routes.js";

const router = Router();

/**
 * Mount all Edge Functions routes
 * These are migrated from Supabase Edge Functions
 */
router.use("/auth", authRoutes);
router.use("/payments", paymentsRoutes);
router.use("/users", usersRoutes);
router.use("/users", usersExtendedRoutes);
router.use("/ai", aiRoutes);
router.use("/files", filesRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/products", productsRoutes);
router.use("/orders", ordersRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/", notificationsRoutes);
router.use("/", miscRoutes);

/**
 * Health check for Edge Functions layer
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Edge Functions proxy is healthy",
    mounted_categories: [
      "auth",
      "payments",
      "users",
      "ai",
      "files",
      "webhooks",
      "products",
      "orders",
      "analytics",
      "notifications/root-shared",
      "misc/root-shared"
    ],
    parity_status: "audit required before claiming 100% functional migration",
  });
});

export default router;

