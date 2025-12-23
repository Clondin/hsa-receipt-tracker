import { google } from 'googleapis';

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
];

// Initialize Google Sheets API client
const initSheetsClient = () => {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || process.env.VITE_GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
        console.warn('Google Sheets credentials missing. Skiping Sheets init.');
        return null;
    }

    const auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: SCOPES
    });

    return google.sheets({ version: 'v4', auth });
};

/**
 * Append a receipt row to the Google Sheet
 * @param {Object} receipt - Receipt object
 */
export const appendReceiptToSheet = async (receipt) => {
    const sheets = initSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!sheets || !spreadsheetId) {
        console.warn('Google Sheets not configured (client or ID missing). Skipping sheet update.');
        return; // specific return to indicate skip
    }

    try {
        // Prepare row headers if needed (could check if empty, but simple append is safer)
        // Columns: Date, Provider, Amount, Category, Notes, Drive Link, Receipt ID
        const values = [[
            receipt.date,
            receipt.provider,
            receipt.amount,
            receipt.category,
            receipt.notes,
            receipt.driveLink,
            receipt.id
        ]];

        const resource = {
            values,
        };

        const result = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:G', // Appending to Sheet1
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        console.log(`✅ Appended to Google Sheet: ${result.data.updates.updatedCells} cells updated.`);
        return result.data;

    } catch (error) {
        console.error('Google Sheets append error:', error.message);
        // Don't throw, just log, so upload flow doesn't break if sheets fails
        return null;
    }
};

/**
 * Check if Sheets is configured
 */
export const isSheetsConfigured = () => {
    return !!(
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
        (process.env.GOOGLE_PRIVATE_KEY || process.env.VITE_GOOGLE_PRIVATE_KEY) &&
        process.env.GOOGLE_SHEET_ID
    );
};
