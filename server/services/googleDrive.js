import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Initialize Google Drive API client
const initDriveClient = () => {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
        throw new Error('Google Drive credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env');
    }

    const auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    return google.drive({ version: 'v3', auth });
};

/**
 * Upload a file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export const uploadToDrive = async (filePath, fileName, mimeType) => {
    const drive = initDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Create a readable stream
    const fileStream = fs.createReadStream(filePath);

    // Generate a descriptive filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const driveFileName = `HSA_Receipt_${dateStr}_${safeName}`;

    const fileMetadata = {
        name: driveFileName,
        ...(folderId && { parents: [folderId] })
    };

    const media = {
        mimeType: mimeType,
        body: fileStream
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink'
        });

        console.log(`✅ Uploaded to Google Drive: ${response.data.name} (ID: ${response.data.id})`);

        return {
            id: response.data.id,
            name: response.data.name,
            webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
            webContentLink: response.data.webContentLink
        };
    } catch (error) {
        console.error('Google Drive upload error:', error.message);
        throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
};

/**
 * Delete a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 */
export const deleteFromDrive = async (fileId) => {
    const drive = initDriveClient();

    try {
        await drive.files.delete({ fileId });
        console.log(`🗑️ Deleted from Google Drive: ${fileId}`);
    } catch (error) {
        console.error('Google Drive delete error:', error.message);
        throw new Error(`Failed to delete from Google Drive: ${error.message}`);
    }
};

/**
 * Get a shareable link for a file
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<string>}
 */
export const getFileLink = async (fileId) => {
    const drive = initDriveClient();

    try {
        // Make the file accessible via link
        await drive.permissions.create({
            fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        const response = await drive.files.get({
            fileId,
            fields: 'webViewLink'
        });

        return response.data.webViewLink;
    } catch (error) {
        console.error('Error getting file link:', error.message);
        throw new Error(`Failed to get file link: ${error.message}`);
    }
};

/**
 * List files in the HSA folder
 * @returns {Promise<Array>}
 */
export const listDriveFiles = async () => {
    const drive = initDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    try {
        const query = folderId
            ? `'${folderId}' in parents and trashed = false`
            : 'trashed = false';

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
            orderBy: 'createdTime desc'
        });

        return response.data.files || [];
    } catch (error) {
        console.error('Error listing Drive files:', error.message);
        throw new Error(`Failed to list Drive files: ${error.message}`);
    }
};
