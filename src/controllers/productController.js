/**
 * @file productController.js
 * @layer Controller (HTTP Translation Layer)
 *
 * Controllers are thin HTTP adapters. Their only jobs are:
 *   1. Extract inputs from `req` (params, query, body).
 *   2. Call the appropriate Service method with plain values.
 *   3. Map the service's result envelope to an HTTP response via `res`.
 *
 * Architectural Contract:
 *   - MUST NOT contain business logic.
 *   - MUST NOT interact with the database or file system directly.
 *   - MUST NOT know how data is fetched — that is the Repository's concern.
 *   - Each method MUST be a standard Express middleware function: (req, res, next).
 */

import { productService } from '../services/productService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a structured JSON success response.
 * @param {import('express').Response} res
 * @param {*}      data
 * @param {number} [statusCode=200]
 * @param {number} [count]
 */
function sendSuccess(res, data, statusCode = 200, count) {
  const body = {
    success: true,
    ...(count !== undefined && { count }),
    data,
  };
  return res.status(statusCode).json(body);
}

/**
 * Sends a structured JSON error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=500]
 */
function sendError(res, message, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller Handler Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/products
 *
 * Handles product listing with optional filtering.
 * Supported query parameters:
 *   - `gender` (string): Filter by gender category.
 *   - `type`   (string): Filter by product type.
 *   - `search` (string): Keyword search on title and description.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getAllProducts(req, res, next) {
  try {
    const { gender, type, search } = req.query;

    const result = productService.getProducts({ gender, type, search });

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    return sendSuccess(res, result.data, 200, result.count);
  } catch (error) {
    next(error); // Delegate to global error handler
  }
}

/**
 * GET /api/v1/products/:id
 *
 * Handles single product retrieval by ID.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const result = productService.getProductById(id);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    return sendSuccess(res, result.data, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/categories
 *
 * Returns all available filter categories for the app's discovery UI.
 * The response includes both raw value arrays and pre-formatted label/value pairs.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getCategories(req, res, next) {
  try {
    const result = productService.getCategories();

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    return sendSuccess(res, result.data, 200);
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const productController = {
  getAllProducts,
  getProductById,
  getCategories,
};
