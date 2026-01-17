/**
 * 📊 ANALYTICS TRACKING SERVICE
 * 
 * Handles all analytics tracking operations:
 * - Product views with 24h deduplication
 * - Shop visits with 24h deduplication
 * - Anti-fraud validation
 * - Aggregated statistics retrieval
 */

import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  UNKNOWN: 'unknown'
};

const TIME_PERIODS = {
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect device type from user agent
 * @param {string} userAgent 
 * @returns {string}
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return DEVICE_TYPES.UNKNOWN;
  
  const ua = userAgent.toLowerCase();
  
  // Check for tablets first (they often include 'mobile' in UA)
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return DEVICE_TYPES.TABLET;
  }
  
  // Check for mobile
  if (/mobile|iphone|ipod|android.*mobile|webos|blackberry|opera mini|iemobile/i.test(ua)) {
    return DEVICE_TYPES.MOBILE;
  }
  
  return DEVICE_TYPES.DESKTOP;
}

/**
 * Generate fingerprint hash from request data
 * @param {Object} data 
 * @returns {string}
 */
function generateFingerprint(data) {
  const components = [
    data.ipAddress,
    data.userAgent,
    data.acceptLanguage || '',
    data.screenResolution || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 64);
}

/**
 * Validate UUID format
 * @param {string} uuid 
 * @returns {boolean}
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get date range for a time period
 * @param {string} period 
 * @returns {Object}
 */
function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case TIME_PERIODS.TODAY:
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    
    case TIME_PERIODS.THIS_WEEK: {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return {
        start: startOfWeek.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    }
    
    case TIME_PERIODS.THIS_MONTH: {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    }
    
    default:
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
  }
}

// ============================================================================
// ANTI-FRAUD VALIDATION
// ============================================================================

/**
 * Check if IP is blocked for a vendor
 * @param {string} vendorId 
 * @param {string} ipAddress 
 * @returns {Promise<boolean>}
 */
async function isIPBlocked(vendorId, ipAddress) {
  try {
    const { data, error } = await supabaseAdmin
      .from('vendor_blocked_ips')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('ip_address', ipAddress)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .single();
    
    return !!data && !error;
  } catch {
    return false;
  }
}

/**
 * Check if the viewer is the vendor themselves
 * @param {string} vendorId 
 * @param {string|null} userId 
 * @returns {Promise<boolean>}
 */
async function isVendorSelfView(vendorId, userId) {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .select('user_id')
      .eq('id', vendorId)
      .single();
    
    if (error || !data) return false;
    
    return data.user_id === userId;
  } catch {
    return false;
  }
}

/**
 * Validate product exists and get vendor ID
 * @param {string} productId 
 * @returns {Promise<Object|null>}
 */
async function getProductInfo(productId) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, vendor_id')
    .eq('id', productId)
    .single();
  
  if (error || !data) {
    logger.warn(`Product not found: ${productId}`);
    return null;
  }
  
  return data;
}

/**
 * Validate vendor exists
 * @param {string} vendorId 
 * @returns {Promise<boolean>}
 */
async function vendorExists(vendorId) {
  const { data, error } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .single();
  
  return !!data && !error;
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track a product view with deduplication
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function trackProductView({
  productId,
  userId,
  sessionId,
  ipAddress,
  userAgent,
  refererUrl,
  acceptLanguage,
  screenResolution,
  countryCode
}) {
  try {
    // Validate required fields
    if (!productId || !isValidUUID(productId)) {
      return { success: false, error: 'Invalid product ID' };
    }
    
    if (!ipAddress) {
      return { success: false, error: 'IP address is required' };
    }
    
    if (!userId && !sessionId) {
      return { success: false, error: 'Either user ID or session ID is required' };
    }
    
    if (userId && !isValidUUID(userId)) {
      return { success: false, error: 'Invalid user ID format' };
    }
    
    // Get product info
    const product = await getProductInfo(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    
    const vendorId = product.vendor_id;
    
    // Anti-fraud checks
    if (await isVendorSelfView(vendorId, userId)) {
      logger.info(`Blocked self-view attempt: vendor ${vendorId}, user ${userId}`);
      return { success: false, error: 'Self-views are not counted', code: 'SELF_VIEW' };
    }
    
    if (await isIPBlocked(vendorId, ipAddress)) {
      logger.info(`Blocked view from banned IP: ${ipAddress} for vendor ${vendorId}`);
      return { success: false, error: 'Access denied', code: 'IP_BLOCKED' };
    }
    
    // Prepare tracking data
    const deviceType = detectDeviceType(userAgent);
    const fingerprint = generateFingerprint({ ipAddress, userAgent, acceptLanguage, screenResolution });
    
    // Call the database function for safe insertion with deduplication
    const { data, error } = await supabaseAdmin.rpc('track_product_view', {
      p_product_id: productId,
      p_vendor_id: vendorId,
      p_user_id: userId || null,
      p_session_id: userId ? null : sessionId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent || null,
      p_fingerprint_hash: fingerprint,
      p_referer_url: refererUrl || null,
      p_device_type: deviceType,
      p_country_code: countryCode || null
    });
    
    if (error) {
      logger.error(`Error tracking product view: ${error.message}`);
      
      // Handle unique constraint violation (duplicate within 24h)
      if (error.code === '23505') {
        return { 
          success: true, 
          deduplicated: true, 
          message: 'View already recorded for today' 
        };
      }
      
      return { success: false, error: 'Failed to track view' };
    }
    
    const result = data?.[0] || data;
    
    logger.info(`Product view tracked: product=${productId}, new=${result?.success}`);
    
    return {
      success: true,
      deduplicated: !result?.success,
      viewId: result?.view_id,
      message: result?.message
    };
    
  } catch (error) {
    logger.error(`trackProductView error: ${error.message}`);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Track a shop visit with deduplication
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function trackShopVisit({
  vendorId,
  userId,
  sessionId,
  ipAddress,
  userAgent,
  refererUrl,
  acceptLanguage,
  screenResolution,
  countryCode,
  entryPage
}) {
  try {
    // Validate required fields
    if (!vendorId || !isValidUUID(vendorId)) {
      return { success: false, error: 'Invalid vendor ID' };
    }
    
    if (!ipAddress) {
      return { success: false, error: 'IP address is required' };
    }
    
    if (!userId && !sessionId) {
      return { success: false, error: 'Either user ID or session ID is required' };
    }
    
    if (userId && !isValidUUID(userId)) {
      return { success: false, error: 'Invalid user ID format' };
    }
    
    // Validate vendor exists
    if (!await vendorExists(vendorId)) {
      return { success: false, error: 'Vendor not found' };
    }
    
    // Anti-fraud checks
    if (await isVendorSelfView(vendorId, userId)) {
      logger.info(`Blocked self-visit attempt: vendor ${vendorId}, user ${userId}`);
      return { success: false, error: 'Self-visits are not counted', code: 'SELF_VIEW' };
    }
    
    if (await isIPBlocked(vendorId, ipAddress)) {
      logger.info(`Blocked visit from banned IP: ${ipAddress} for vendor ${vendorId}`);
      return { success: false, error: 'Access denied', code: 'IP_BLOCKED' };
    }
    
    // Prepare tracking data
    const deviceType = detectDeviceType(userAgent);
    const fingerprint = generateFingerprint({ ipAddress, userAgent, acceptLanguage, screenResolution });
    
    // Call the database function for safe insertion with deduplication
    const { data, error } = await supabaseAdmin.rpc('track_shop_visit', {
      p_vendor_id: vendorId,
      p_user_id: userId || null,
      p_session_id: userId ? null : sessionId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent || null,
      p_fingerprint_hash: fingerprint,
      p_referer_url: refererUrl || null,
      p_device_type: deviceType,
      p_country_code: countryCode || null,
      p_entry_page: entryPage || null
    });
    
    if (error) {
      logger.error(`Error tracking shop visit: ${error.message}`);
      
      // Handle unique constraint violation (duplicate within 24h)
      if (error.code === '23505') {
        return { 
          success: true, 
          deduplicated: true, 
          message: 'Visit already recorded for today' 
        };
      }
      
      return { success: false, error: 'Failed to track visit' };
    }
    
    const result = data?.[0] || data;
    
    logger.info(`Shop visit tracked: vendor=${vendorId}, new=${result?.success}`);
    
    return {
      success: true,
      deduplicated: !result?.success,
      visitId: result?.visit_id,
      message: result?.message
    };
    
  } catch (error) {
    logger.error(`trackShopVisit error: ${error.message}`);
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// ANALYTICS RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get vendor shop analytics
 * @param {string} vendorId 
 * @param {string} userId - The authenticated user requesting analytics
 * @returns {Promise<Object>}
 */
export async function getVendorAnalytics(vendorId, userId) {
  try {
    // Validate vendor ID
    if (!vendorId || !isValidUUID(vendorId)) {
      return { success: false, error: 'Invalid vendor ID' };
    }
    
    // Verify user owns this vendor
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, user_id, name')
      .eq('id', vendorId)
      .single();
    
    if (vendorError || !vendor) {
      return { success: false, error: 'Vendor not found' };
    }
    
    if (vendor.user_id !== userId) {
      logger.warn(`Unauthorized analytics access attempt: user ${userId} for vendor ${vendorId}`);
      return { success: false, error: 'Unauthorized access' };
    }
    
    // Get date ranges
    const todayRange = getDateRange(TIME_PERIODS.TODAY);
    const weekRange = getDateRange(TIME_PERIODS.THIS_WEEK);
    const monthRange = getDateRange(TIME_PERIODS.THIS_MONTH);
    
    // Fetch analytics for all periods in parallel
    const [todayStats, weekStats, monthStats] = await Promise.all([
      getShopVisitsForPeriod(vendorId, todayRange.start, todayRange.end),
      getShopVisitsForPeriod(vendorId, weekRange.start, weekRange.end),
      getShopVisitsForPeriod(vendorId, monthRange.start, monthRange.end)
    ]);
    
    // Also get product views summary
    const [todayProductViews, weekProductViews, monthProductViews] = await Promise.all([
      getProductViewsSummaryForPeriod(vendorId, todayRange.start, todayRange.end),
      getProductViewsSummaryForPeriod(vendorId, weekRange.start, weekRange.end),
      getProductViewsSummaryForPeriod(vendorId, monthRange.start, monthRange.end)
    ]);
    
    return {
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          name: vendor.name
        },
        shopVisits: {
          today: todayStats,
          thisWeek: weekStats,
          thisMonth: monthStats
        },
        productViews: {
          today: todayProductViews,
          thisWeek: weekProductViews,
          thisMonth: monthProductViews
        },
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error(`getVendorAnalytics error: ${error.message}`);
    return { success: false, error: 'Failed to retrieve analytics' };
  }
}

/**
 * Get product-level analytics for a vendor
 * @param {string} vendorId 
 * @param {string} userId 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
export async function getProductsAnalytics(vendorId, userId, options = {}) {
  try {
    const { productId, limit = 50, offset = 0 } = options;
    
    // Validate vendor ID
    if (!vendorId || !isValidUUID(vendorId)) {
      return { success: false, error: 'Invalid vendor ID' };
    }
    
    // Verify user owns this vendor
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, user_id')
      .eq('id', vendorId)
      .single();
    
    if (vendorError || !vendor) {
      return { success: false, error: 'Vendor not found' };
    }
    
    if (vendor.user_id !== userId) {
      logger.warn(`Unauthorized product analytics access: user ${userId} for vendor ${vendorId}`);
      return { success: false, error: 'Unauthorized access' };
    }
    
    // Get date ranges
    const todayRange = getDateRange(TIME_PERIODS.TODAY);
    const weekRange = getDateRange(TIME_PERIODS.THIS_WEEK);
    const monthRange = getDateRange(TIME_PERIODS.THIS_MONTH);
    
    // If specific product requested
    if (productId) {
      if (!isValidUUID(productId)) {
        return { success: false, error: 'Invalid product ID' };
      }
      
      // Verify product belongs to vendor
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name, vendor_id')
        .eq('id', productId)
        .eq('vendor_id', vendorId)
        .single();
      
      if (productError || !product) {
        return { success: false, error: 'Product not found or does not belong to vendor' };
      }
      
      const [todayStats, weekStats, monthStats] = await Promise.all([
        getProductViewsForPeriod(productId, todayRange.start, todayRange.end),
        getProductViewsForPeriod(productId, weekRange.start, weekRange.end),
        getProductViewsForPeriod(productId, monthRange.start, monthRange.end)
      ]);
      
      return {
        success: true,
        data: {
          product: {
            id: product.id,
            name: product.name
          },
          views: {
            today: todayStats,
            thisWeek: weekStats,
            thisMonth: monthStats
          },
          generatedAt: new Date().toISOString()
        }
      };
    }
    
    // Get all products with their analytics
    const products = await getProductsWithAnalytics(vendorId, {
      todayRange,
      weekRange,
      monthRange,
      limit,
      offset
    });
    
    return {
      success: true,
      data: {
        products,
        pagination: {
          limit,
          offset,
          hasMore: products.length === limit
        },
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error(`getProductsAnalytics error: ${error.message}`);
    return { success: false, error: 'Failed to retrieve product analytics' };
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR ANALYTICS QUERIES
// ============================================================================

/**
 * Get shop visits for a specific period
 */
async function getShopVisitsForPeriod(vendorId, startDate, endDate) {
  const { data, error } = await supabaseAdmin
    .from('shop_visits')
    .select('id, user_id, session_id, device_type, visited_at')
    .eq('vendor_id', vendorId)
    .gte('visited_at', startDate)
    .lt('visited_at', endDate);
  
  if (error) {
    logger.error(`Error fetching shop visits: ${error.message}`);
    return { totalVisits: 0, uniqueVisitors: 0, deviceBreakdown: {} };
  }
  
  const visits = data || [];
  const uniqueVisitors = new Set(
    visits.map(v => v.user_id || v.session_id)
  ).size;
  
  const deviceBreakdown = visits.reduce((acc, v) => {
    const device = v.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalVisits: visits.length,
    uniqueVisitors,
    authenticatedVisits: visits.filter(v => v.user_id).length,
    anonymousVisits: visits.filter(v => !v.user_id).length,
    deviceBreakdown
  };
}

/**
 * Get product views for a specific period (single product)
 */
async function getProductViewsForPeriod(productId, startDate, endDate) {
  const { data, error } = await supabaseAdmin
    .from('product_views')
    .select('id, user_id, session_id, device_type, viewed_at')
    .eq('product_id', productId)
    .gte('viewed_at', startDate)
    .lt('viewed_at', endDate);
  
  if (error) {
    logger.error(`Error fetching product views: ${error.message}`);
    return { totalViews: 0, uniqueViewers: 0, deviceBreakdown: {} };
  }
  
  const views = data || [];
  const uniqueViewers = new Set(
    views.map(v => v.user_id || v.session_id)
  ).size;
  
  const deviceBreakdown = views.reduce((acc, v) => {
    const device = v.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalViews: views.length,
    uniqueViewers,
    authenticatedViews: views.filter(v => v.user_id).length,
    anonymousViews: views.filter(v => !v.user_id).length,
    deviceBreakdown
  };
}

/**
 * Get product views summary for a vendor (all products)
 */
async function getProductViewsSummaryForPeriod(vendorId, startDate, endDate) {
  const { data, error } = await supabaseAdmin
    .from('product_views')
    .select('id, user_id, session_id, device_type')
    .eq('vendor_id', vendorId)
    .gte('viewed_at', startDate)
    .lt('viewed_at', endDate);
  
  if (error) {
    logger.error(`Error fetching product views summary: ${error.message}`);
    return { totalViews: 0, uniqueViewers: 0 };
  }
  
  const views = data || [];
  const uniqueViewers = new Set(
    views.map(v => v.user_id || v.session_id)
  ).size;
  
  return {
    totalViews: views.length,
    uniqueViewers
  };
}

/**
 * Get all products with their analytics
 */
async function getProductsWithAnalytics(vendorId, { todayRange, weekRange, monthRange, limit, offset }) {
  // Get products
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (productsError || !products) {
    logger.error(`Error fetching products: ${productsError?.message}`);
    return [];
  }
  
  // Get analytics for each product
  const productsWithAnalytics = await Promise.all(
    products.map(async (product) => {
      const [todayStats, weekStats, monthStats] = await Promise.all([
        getProductViewsForPeriod(product.id, todayRange.start, todayRange.end),
        getProductViewsForPeriod(product.id, weekRange.start, weekRange.end),
        getProductViewsForPeriod(product.id, monthRange.start, monthRange.end)
      ]);
      
      return {
        id: product.id,
        name: product.name,
        views: {
          today: todayStats,
          thisWeek: weekStats,
          thisMonth: monthStats
        }
      };
    })
  );
  
  // Sort by month views descending
  return productsWithAnalytics.sort(
    (a, b) => b.views.thisMonth.totalViews - a.views.thisMonth.totalViews
  );
}

// ============================================================================
// ADMIN/MAINTENANCE FUNCTIONS
// ============================================================================

/**
 * Run daily aggregation (to be called by cron job)
 * @param {Date} date - Date to aggregate (defaults to yesterday)
 * @returns {Promise<Object>}
 */
export async function runDailyAggregation(date = null) {
  try {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const { error } = await supabaseAdmin.rpc('aggregate_daily_analytics', {
      p_date: dateStr
    });
    
    if (error) {
      logger.error(`Daily aggregation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    logger.info(`Daily aggregation completed for ${dateStr}`);
    return { success: true, date: dateStr };
    
  } catch (error) {
    logger.error(`runDailyAggregation error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup old analytics data (to be called by cron job)
 * @returns {Promise<Object>}
 */
export async function cleanupOldData() {
  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_old_analytics_data');
    
    if (error) {
      logger.error(`Data cleanup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    logger.info(`Data cleanup completed, deleted ${data} records`);
    return { success: true, deletedCount: data };
    
  } catch (error) {
    logger.error(`cleanupOldData error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export default {
  trackProductView,
  trackShopVisit,
  getVendorAnalytics,
  getProductsAnalytics,
  runDailyAggregation,
  cleanupOldData
};
