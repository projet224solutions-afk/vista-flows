const express = require('express');
const checkSellerRole = require('../../middleware/checkSellerRole');
const { getProducts, createProduct } = require('../../controllers/vendor/productController');

const router = express.Router();

router.get('/', checkSellerRole, getProducts);
router.post('/', checkSellerRole, createProduct);

module.exports = router;


