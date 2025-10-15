const express = require('express');
const checkSellerRole = require('../../middleware/checkSellerRole');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../../controllers/vendor/productController');

const router = express.Router();

router.get('/', checkSellerRole, getProducts);
router.post('/', checkSellerRole, createProduct);
router.put('/:id', checkSellerRole, updateProduct);
router.delete('/:id', checkSellerRole, deleteProduct);

module.exports = router;


