const express = require('express');
const checkSellerRole = require('../../middleware/checkSellerRole');
const { getOrders, createOrder, updateOrder } = require('../../controllers/vendor/orderController');

const router = express.Router();

router.get('/', checkSellerRole, getOrders);
router.post('/', checkSellerRole, createOrder);
router.put('/:id', checkSellerRole, updateOrder);

module.exports = router;


