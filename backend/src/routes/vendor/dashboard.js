const express = require('express');
const checkSellerRole = require('../../middleware/checkSellerRole');
const { getVendorDashboard } = require('../../controllers/vendor/dashboardController');

const router = express.Router();

router.get('/dashboard', checkSellerRole, getVendorDashboard);

module.exports = router;


