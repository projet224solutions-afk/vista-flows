/**
 * 📊 ANALYTICS ROUTES
 * 
 * Endpoints for analytics tracking and retrieval:
 * - POST /track/product-view    (public/semi-public)
 * - POST /track/shop-visit      (public/semi-public)
 * - GET /vendor/:vendorId/analytics           (authenticated)
 * - GET /vendor/:vendorId/products/analytics  (authenticated)
 */

import { Router } from 'express';
import { 
  handleProductView,
  handleShopVisit,
  handleGetVendorAnalytics,
  handleGetProductsAnalytics
} from '../controllers/analytics.controller.js';
import { verifyJWT, optionalJWT } from '../middlewares/auth.middleware.js';
import { trackingRateLimiter, analyticsRateLimiter } from '../middlewares/analytics.middleware.js';
import { validateTrackingRequest, validateAnalyticsRequest } from '../middlewares/analytics.middleware.js';

const router = Router();

// ============================================================================
// TRACKING ENDPOINTS (Public - but with optional auth for better tracking)
// ============================================================================

/**
 * @route   POST /track/product-view
 * @desc    Track a product view
 * @access  Public (optional auth for authenticated users)
 * @body    { productId: UUID, sessionId?: string, refererUrl?: string, countryCode?: string }
 * @headers X-Session-ID for anonymous users
 */
router.post(
  '/track/product-view',
  trackingRateLimiter,
  optionalJWT,
  validateTrackingRequest('product'),
  handleProductView
);

/**
 * @route   POST /track/shop-visit
 * @desc    Track a shop/vendor page visit
 * @access  Public (optional auth for authenticated users)
 * @body    { vendorId: UUID, sessionId?: string, refererUrl?: string, countryCode?: string, entryPage?: string }
 * @headers X-Session-ID for anonymous users
 */
router.post(
  '/track/shop-visit',
  trackingRateLimiter,
  optionalJWT,
  validateTrackingRequest('shop'),
  handleShopVisit
);

// ============================================================================
// ANALYTICS RETRIEVAL ENDPOINTS (Authenticated - vendors only)
// ============================================================================

/**
 * @route   GET /vendor/:vendorId/analytics
 * @desc    Get shop-level analytics for a vendor
 * @access  Private (vendor owner only)
 * @params  vendorId - The vendor's UUID
 * @returns {
 *   success: boolean,
 *   data: {
 *     vendor: { id, name },
 *     shopVisits: { today, thisWeek, thisMonth },
 *     productViews: { today, thisWeek, thisMonth },
 *     generatedAt: ISO date
 *   }
 * }
 */
router.get(
  '/vendor/:vendorId/analytics',
  analyticsRateLimiter,
  verifyJWT,
  validateAnalyticsRequest,
  handleGetVendorAnalytics
);

/**
 * @route   GET /vendor/:vendorId/products/analytics
 * @desc    Get product-level analytics for a vendor
 * @access  Private (vendor owner only)
 * @params  vendorId - The vendor's UUID
 * @query   productId? - Optional specific product UUID
 * @query   limit? - Number of products (default 50, max 100)
 * @query   offset? - Pagination offset (default 0)
 * @returns {
 *   success: boolean,
 *   data: {
 *     products: [{ id, name, views: { today, thisWeek, thisMonth } }],
 *     pagination: { limit, offset, hasMore },
 *     generatedAt: ISO date
 *   }
 * }
 */
router.get(
  '/vendor/:vendorId/products/analytics',
  analyticsRateLimiter,
  verifyJWT,
  validateAnalyticsRequest,
  handleGetProductsAnalytics
);

export default router;
