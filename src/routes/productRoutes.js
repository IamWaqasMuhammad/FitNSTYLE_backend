/**
 * @file productRoutes.js
 * @layer Routes (Express Router Declarations)
 *
 * This file is purely a routing manifest. It maps HTTP method + path
 * combinations to controller handler functions. No logic lives here.
 *
 * Route Inventory:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Method  │  Path                    │  Handler               │  Desc   │
 * ├──────────┼──────────────────────────┼────────────────────────┼─────────┤
 * │  GET     │  /api/v1/products        │  getAllProducts         │ List    │
 * │  GET     │  /api/v1/products/:id    │  getProductById        │ Single  │
 * │  GET     │  /api/v1/categories      │  getCategories         │ Filters │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Query Parameters Supported by GET /api/v1/products:
 *   ?gender=men|women|kids
 *   ?type=shirt|pant|dress|accessories|footwear
 *   ?search=<keyword>
 *   (All parameters are optional and composable)
 */

import { Router } from 'express';
import { productController } from '../controllers/productController.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Product Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/products
 * @desc    Get all products with optional filtering by gender, type, and search.
 * @access  Public
 * @query   {string} [gender] - 'men' | 'women' | 'kids'
 * @query   {string} [type]   - 'shirt' | 'pant' | 'dress' | 'accessories' | 'footwear'
 * @query   {string} [search] - Keyword to match against title/description
 */
router.get('/products', productController.getAllProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get a single product by its unique integer ID.
 * @access  Public
 * @param   {string} id - The product's unique ID (e.g., /products/1)
 */
router.get('/products/:id', productController.getProductById);

// ─────────────────────────────────────────────────────────────────────────────
// Category / Meta Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/categories
 * @desc    Get all available filter categories (genders, types) with label/value pairs.
 * @access  Public
 */
router.get('/categories', productController.getCategories);

export default router;
