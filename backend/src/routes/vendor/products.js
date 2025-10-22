const express = require('express');
const checkSellerRole = require('../../middleware/checkSellerRole');
const { autoGeneratePublicId } = require('../../middleware/publicIdMiddleware');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../../controllers/vendor/productController');

const router = express.Router();

router.get('/', checkSellerRole, getProducts);
router.post('/', checkSellerRole, autoGeneratePublicId('products'), createProduct);
router.put('/:id', checkSellerRole, updateProduct);
router.delete('/:id', checkSellerRole, deleteProduct);

module.exports = router;


