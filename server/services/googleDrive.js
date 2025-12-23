import { google } from 'googleapis';
import fs from 'fs';
import { getAuthenticatedClient, isAuthenticated } from './googleAuth.js';

/**
 * Get Drive client using OAuth
 */
const getDriveClient = async () => {
    const authClient = await getAuthenticatedClient();
    if (!authClient) {
        throw new Error('Not authenticated. Please login with Google first.');
    }
    return google.drive({ version: 'v3', auth: authClient });
};

/**
 * Upload a file to Google Drive using OAuth
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export const uploadToDrive = async (filePath, fileName, mimeType) => {
    if (!isAuthenticated()) {
        throw new Error('Not authenticated. Please login with Google first.');
    }

    const drive = await getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

    // Create a readable stream
    const fileStream = fs.createReadStream(filePath);

    // Generate a descriptive filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const driveFileName = `HSA_Receipt_${dateStr}_${safeName}`;

    const fileMetadata = {
        name: driveFileName,
        ...(folderId && folderId !== 'root' && { parents: [folderId] })
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
    if (!isAuthenticated()) {
        console.warn('Not authenticated, skipping Drive delete');
        return;
    }

    const drive = await getDriveClient();

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
    const drive = await getDriveClient();

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
