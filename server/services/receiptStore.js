import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'receipts.json');

// Ensure data directory exists
const ensureDataDir = () => {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Load receipts from JSON file
const loadReceipts = () => {
    ensureDataDir();

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
        return [];
    }

    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading receipts:', error);
        return [];
    }
};

// Save receipts to JSON file
const saveReceipts = (receipts) => {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(receipts, null, 2));
};

/**
 * Save or update a receipt
 * @param {Object} receipt - Receipt object to save
 */
export const saveReceipt = async (receipt) => {
    const receipts = loadReceipts();
    const existingIndex = receipts.findIndex(r => r.id === receipt.id);

    if (existingIndex >= 0) {
        receipts[existingIndex] = { ...receipts[existingIndex], ...receipt };
    } else {
        receipts.push(receipt);
    }

    saveReceipts(receipts);
    return receipt;
};

/**
 * Get all receipts
 * @returns {Array} Array of receipt objects
 */
export const getReceipts = async () => {
    return loadReceipts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Get a receipt by ID
 * @param {string} id - Receipt ID
 * @returns {Object|null} Receipt object or null
 */
export const getReceiptById = async (id) => {
    const receipts = loadReceipts();
    return receipts.find(r => r.id === id) || null;
};

/**
 * Delete a receipt
 * @param {string} id - Receipt ID
 */
export const deleteReceipt = async (id) => {
    const receipts = loadReceipts();
    const filtered = receipts.filter(r => r.id !== id);
    saveReceipts(filtered);
};

/**
 * Get receipts by category
 * @param {string} category - Category name
 * @returns {Array} Filtered receipts
 */
export const getReceiptsByCategory = async (category) => {
    const receipts = loadReceipts();
    return receipts.filter(r => r.category === category);
};

/**
 * Get expense summary
 * @returns {Object} Summary statistics
 */
export const getExpenseSummary = async () => {
    const receipts = loadReceipts();

    const summary = {
        totalReceipts: receipts.length,
        totalAmount: 0,
        byCategory: {},
        byMonth: {},
        syncedCount: 0,
        pendingSyncCount: 0
    };

    receipts.forEach(r => {
        summary.totalAmount += r.amount || 0;

        // By category
        if (!summary.byCategory[r.category]) {
            summary.byCategory[r.category] = { count: 0, amount: 0 };
        }
        summary.byCategory[r.category].count++;
        summary.byCategory[r.category].amount += r.amount || 0;

        // By month
        const month = r.date?.substring(0, 7) || 'Unknown';
        if (!summary.byMonth[month]) {
            summary.byMonth[month] = { count: 0, amount: 0 };
        }
        summary.byMonth[month].count++;
        summary.byMonth[month].amount += r.amount || 0;

        // Sync status
        if (r.syncedToDrive) {
            summary.syncedCount++;
        } else {
            summary.pendingSyncCount++;
        }
    });

    return summary;
};
