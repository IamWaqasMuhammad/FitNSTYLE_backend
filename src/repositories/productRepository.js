/**
 * @file productRepository.js
 * @layer Repository (Data Access Layer)
 *
 * This is the ONLY layer in the entire application that is aware of the
 * underlying data source. All file I/O operations are isolated here.
 *
 * Architectural Contract:
 *   - Reads and parses the products.json data source.
 *   - Applies low-level structural filters (field matching) directly on raw data.
 *   - Returns plain data objects — NEVER HTTP responses, NEVER business logic.
 *
 * Future Migration Note:
 *   To switch from JSON to MongoDB/PostgreSQL, ONLY this file needs to change.
 *   All layers above (Service → Controller → Route) remain completely untouched.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Path Resolution (ESM-compatible __dirname alternative)
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_SOURCE_PATH = join(__dirname, '../constants/products.json');

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads and parses the products JSON file from disk.
 * Uses synchronous read intentionally — the file acts as a static data store
 * (like a seeded DB). In a real DB scenario, this becomes an async query.
 *
 * @returns {Product[]} Parsed array of product objects.
 * @throws {Error} If the file is missing, unreadable, or contains invalid JSON.
 */
function loadProductsFromDisk() {
  try {
    const rawJson = readFileSync(DATA_SOURCE_PATH, 'utf-8');
    const parsed = JSON.parse(rawJson);

    if (!Array.isArray(parsed)) {
      throw new TypeError(
        `Data integrity error: Expected an array in products.json but received ${typeof parsed}`
      );
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `[Repository] Data source not found at path: ${DATA_SOURCE_PATH}. ` +
        `Ensure products.json exists at src/constants/products.json`
      );
    }
    if (error instanceof SyntaxError) {
      throw new SyntaxError(
        `[Repository] Failed to parse products.json — invalid JSON format. ` +
        `Details: ${error.message}`
      );
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Repository Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves all products from the data source, applying optional structural
 * filters at the data access level for efficiency.
 *
 * @param {Object}  filters                    - Optional filter criteria.
 * @param {string} [filters.genderCategory]    - Filter by gender ('men'|'women'|'kids').
 * @param {string} [filters.productType]       - Filter by type ('shirt'|'pant'|'dress'|'accessories'|'footwear').
 * @param {string} [filters.searchTerm]        - Raw search string to filter by title/description.
 * @returns {Product[]} Filtered array of product objects.
 */
function findAllProducts({ genderCategory, productType, searchTerm } = {}) {
  let products = loadProductsFromDisk();

  // Apply genderCategory filter (exact match, case-insensitive)
  if (genderCategory) {
    const normalizedGender = genderCategory.toLowerCase().trim();
    products = products.filter(
      (p) => p.genderCategory?.toLowerCase() === normalizedGender
    );
  }

  // Apply productType filter (exact match, case-insensitive)
  if (productType) {
    const normalizedType = productType.toLowerCase().trim();
    products = products.filter(
      (p) => p.productType?.toLowerCase() === normalizedType
    );
  }

  // Apply search filter (partial match on title and description)
  if (searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.title?.toLowerCase().includes(normalizedSearch) ||
        p.description?.toLowerCase().includes(normalizedSearch)
    );
  }

  return products;
}

/**
 * Finds a single product by its unique integer ID.
 *
 * @param {number|string} id - The product's unique identifier.
 * @returns {Product|null} The matching product object, or null if not found.
 */
function findProductById(id) {
  const products = loadProductsFromDisk();
  const numericId = Number(id);

  if (Number.isNaN(numericId)) return null;

  return products.find((p) => p.id === numericId) ?? null;
}

/**
 * Extracts all distinct values for a given product field.
 * Used by the service layer to derive dynamic category lists.
 *
 * @param {string} field - The field name to extract unique values from.
 * @returns {string[]} Sorted array of unique non-null string values.
 */
function findDistinctValues(field) {
  const products = loadProductsFromDisk();

  const uniqueValues = [
    ...new Set(
      products
        .map((p) => p[field])
        .filter((val) => val !== undefined && val !== null && val !== '')
    ),
  ];

  return uniqueValues.sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const productRepository = {
  findAllProducts,
  findProductById,
  findDistinctValues,
};
