/**
 * @file productService.js
 * @layer Service (Business Logic Layer)
 *
 * The Service layer sits between Controllers (HTTP concerns) and Repositories
 * (data access concerns). It is the brain of the application.
 *
 * Architectural Contract:
 *   - Receives plain JavaScript values (not req/res objects).
 *   - Validates, sanitizes, and transforms inputs before calling the repository.
 *   - Applies business rules (e.g., validation, allowed enum values).
 *   - Returns structured result objects: { success, data, error, statusCode }.
 *   - Is completely unaware of HTTP — it works equally well in a CLI, queue, or API.
 */

import { productRepository } from '../repositories/productRepository.js';

// ─────────────────────────────────────────────────────────────────────────────
// Domain Constants (Allowed Enum Values)
// ─────────────────────────────────────────────────────────────────────────────

/** Allowed gender category values as defined by the product schema. */
export const ALLOWED_GENDER_CATEGORIES = Object.freeze(['men', 'women', 'kids']);

/** Allowed product type values as defined by the product schema. */
export const ALLOWED_PRODUCT_TYPES = Object.freeze([
  'shirt',
  'pant',
  'dress',
  'accessories',
  'footwear',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standardised success result envelope.
 * @param {*}      data       - The payload to return.
 * @param {number} [count]    - Optional item count for list responses.
 * @returns {{ success: true, count?: number, data: * }}
 */
function ok(data, count) {
  const result = { success: true, data };
  if (count !== undefined) result.count = count;
  return result;
}

/**
 * Creates a standardised error result envelope.
 * @param {string} message    - Human-readable error message.
 * @param {number} statusCode - Suggested HTTP status code.
 * @returns {{ success: false, error: string, statusCode: number }}
 */
function fail(message, statusCode = 500) {
  return { success: false, error: message, statusCode };
}

/**
 * Strips dangerous/unexpected characters from a search string.
 * Prevents regex injection and keeps logs clean.
 * @param {string} raw - Raw user-provided search input.
 * @returns {string} Sanitised search string.
 */
function sanitizeSearchTerm(raw) {
  // Allow alphanumeric, spaces, hyphens, and basic punctuation
  return String(raw)
    .replace(/[^a-zA-Z0-9\s\-_'.,]/g, '')
    .trim()
    .substring(0, 100); // Hard cap at 100 characters
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves a filtered list of products based on optional query parameters.
 *
 * Business Rules Applied:
 *   1. `gender` must be one of the allowed enum values (if provided).
 *   2. `type` must be one of the allowed enum values (if provided).
 *   3. `search` is sanitised before being forwarded to the repository.
 *   4. Returns a count alongside the data for client-side pagination awareness.
 *
 * @param {Object}  queryParams             - Raw query parameters from the request.
 * @param {string} [queryParams.gender]     - Gender category filter.
 * @param {string} [queryParams.type]       - Product type filter.
 * @param {string} [queryParams.search]     - Keyword search string.
 * @returns {{ success: boolean, count?: number, data?: Product[], error?: string, statusCode?: number }}
 */
function getProducts({ gender, type, search } = {}) {
  try {
    // ── Business Rule 1: Validate gender enum ─────────────────────────────
    if (gender !== undefined) {
      const normalizedGender = gender.toLowerCase().trim();
      if (!ALLOWED_GENDER_CATEGORIES.includes(normalizedGender)) {
        return fail(
          `Invalid gender filter: "${gender}". Allowed values are: ${ALLOWED_GENDER_CATEGORIES.join(', ')}.`,
          400
        );
      }
    }

    // ── Business Rule 2: Validate product type enum ───────────────────────
    if (type !== undefined) {
      const normalizedType = type.toLowerCase().trim();
      if (!ALLOWED_PRODUCT_TYPES.includes(normalizedType)) {
        return fail(
          `Invalid type filter: "${type}". Allowed values are: ${ALLOWED_PRODUCT_TYPES.join(', ')}.`,
          400
        );
      }
    }

    // ── Business Rule 3: Sanitize search input ────────────────────────────
    const sanitizedSearch = search ? sanitizeSearchTerm(search) : undefined;

    if (search && !sanitizedSearch) {
      return fail('Search term contains only invalid characters.', 400);
    }

    // ── Delegate to Repository ────────────────────────────────────────────
    const products = productRepository.findAllProducts({
      genderCategory: gender?.toLowerCase().trim(),
      productType: type?.toLowerCase().trim(),
      searchTerm: sanitizedSearch,
    });

    return ok(products, products.length);
  } catch (error) {
    console.error('[ProductService.getProducts] Unexpected error:', error);
    return fail('Failed to retrieve products. Please try again later.', 500);
  }
}

/**
 * Retrieves a single product by its ID.
 *
 * Business Rules Applied:
 *   1. `id` must be a positive integer.
 *   2. Returns 404 if the product is not found in the data source.
 *
 * @param {string|number} id - The product ID from the URL parameter.
 * @returns {{ success: boolean, data?: Product, error?: string, statusCode?: number }}
 */
function getProductById(id) {
  try {
    // ── Business Rule 1: Validate ID is a positive integer ────────────────
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return fail(`Invalid product ID: "${id}". ID must be a positive integer.`, 400);
    }

    // ── Delegate to Repository ────────────────────────────────────────────
    const product = productRepository.findProductById(numericId);

    // ── Business Rule 2: Handle not found ────────────────────────────────
    if (!product) {
      return fail(`Product with ID ${numericId} was not found.`, 404);
    }

    return ok(product);
  } catch (error) {
    console.error('[ProductService.getProductById] Unexpected error:', error);
    return fail('Failed to retrieve product. Please try again later.', 500);
  }
}

/**
 * Returns the available categories and filter metadata for the app's
 * discovery/filter UI screens.
 *
 * Merges:
 *   - Dynamically derived gender categories and product types from the dataset.
 *   - Static schema-level category definitions for guaranteed completeness.
 *
 * @returns {{ success: boolean, data?: CategoriesPayload, error?: string, statusCode?: number }}
 */
function getCategories() {
  try {
    // Derive live values from the actual dataset
    const dynamicGenders = productRepository.findDistinctValues('genderCategory');
    const dynamicTypes = productRepository.findDistinctValues('productType');

    // Merge with schema-defined allowed values so the UI always has complete options,
    // even if some categories have no products yet
    const mergedGenders = [
      ...new Set([...ALLOWED_GENDER_CATEGORIES, ...dynamicGenders]),
    ].sort();

    const mergedTypes = [
      ...new Set([...ALLOWED_PRODUCT_TYPES, ...dynamicTypes]),
    ].sort();

    const payload = {
      genderCategories: mergedGenders,
      productTypes: mergedTypes,
      filters: {
        gender: mergedGenders.map((g) => ({
          label: g.charAt(0).toUpperCase() + g.slice(1),
          value: g,
        })),
        type: mergedTypes.map((t) => ({
          label: t.charAt(0).toUpperCase() + t.slice(1),
          value: t,
        })),
      },
    };

    return ok(payload);
  } catch (error) {
    console.error('[ProductService.getCategories] Unexpected error:', error);
    return fail('Failed to retrieve categories. Please try again later.', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const productService = {
  getProducts,
  getProductById,
  getCategories,
};
