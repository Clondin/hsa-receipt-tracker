import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { uploadToDrive, deleteFromDrive, getFileLink } from './services/googleDrive.js';
import { appendReceiptToSheet, isSheetsConfigured } from './services/googleSheets.js';
import { getAuthUrl, exchangeCodeForTokens, isAuthenticated, clearTokens } from './services/googleAuth.js';
import { saveReceipt, getReceipts, deleteReceipt, getReceiptById } from './services/receiptStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isVercel = process.env.VERCEL === '1';
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Use /tmp for uploads in Vercel, or local uploadsDir in dev
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

// API Routes

// ============ OAuth Routes ============

// Get auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

// Start OAuth login
app.get('/api/auth/login', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    await exchangeCodeForTokens(code);
    // Redirect to frontend with success
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  clearTokens();
  res.json({ success: true });
});

// ============ Receipt Routes ============

// Upload a receipt
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { provider, amount, date, category, notes } = req.body;

    // Upload to Google Drive
    let driveFileId = null;
    let driveLink = null;

    try {
      const driveResult = await uploadToDrive(req.file.path, req.file.originalname, req.file.mimetype);
      driveFileId = driveResult.id;
      driveLink = driveResult.webViewLink;
    } catch (driveError) {
      console.warn('Google Drive upload failed, storing locally:', driveError.message);
    }

    // Append to Google Sheet
    let sheetResult = null;
    try {
      if (driveLink) { // Only append if we have a drive link (or maybe even if not?) - let's append anyway but link might be empty
        // We pass the full receipt object, but constructing it here first is better
      }
    } catch (sheetError) {
      console.warn('Google Sheets append failed');
    }

    // Create receipt record
    const receipt = {
      id: uuidv4(),
      originalName: req.file.originalname,
      localPath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      provider: provider || 'Unknown Provider',
      amount: parseFloat(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'General',
      notes: notes || '',
      driveFileId,
      driveLink,
      syncedToDrive: !!driveFileId,
      createdAt: new Date().toISOString()
    };

    // Append to Google Sheet
    if (driveFileId) {
      await appendReceiptToSheet(receipt);
    }

    await saveReceipt(receipt);

    const sheetStatus = isSheetsConfigured() ? ' & Sheets' : '';

    res.json({
      success: true,
      receipt,
      message: driveFileId
        ? `Receipt uploaded and synced to Google Drive${sheetStatus}!`
        : 'Receipt saved locally (Google Drive sync pending)'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload receipt' });
  }
});

// Get all receipts
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await getReceipts();

    // Calculate totals by category
    const totals = receipts.reduce((acc, r) => {
      acc.total += r.amount;
      acc.byCategory[r.category] = (acc.byCategory[r.category] || 0) + r.amount;
      return acc;
    }, { total: 0, byCategory: {} });

    res.json({ receipts, totals });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get receipt image
app.get('/api/receipts/:id/image', async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (fs.existsSync(receipt.localPath)) {
      res.sendFile(receipt.localPath);
    } else {
      res.status(404).json({ error: 'Image file not found' });
    }
  } catch (error) {
    console.error('Error fetching receipt image:', error);
    res.status(500).json({ error: 'Failed to fetch receipt image' });
  }
});

// Delete a receipt
app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Delete from Google Drive if synced
    if (receipt.driveFileId) {
      try {
        await deleteFromDrive(receipt.driveFileId);
      } catch (driveError) {
        console.warn('Failed to delete from Drive:', driveError.message);
      }
    }

    // Delete local file
    if (fs.existsSync(receipt.localPath)) {
      fs.unlinkSync(receipt.localPath);
    }

    // Delete from store
    await deleteReceipt(req.params.id);

    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// Get configuration (safe subset)
app.get('/api/config', (req, res) => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const maskedEmail = email ? `${email.substring(0, 5)}...${email.substring(email.indexOf('@'))}` : 'Not configured';

  res.json({
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.VITE_GOOGLE_DRIVE_FOLDER_ID || 'Not configured',
    sheetId: process.env.GOOGLE_SHEET_ID || 'Not configured',
    serviceAccount: maskedEmail,
    isSheetsConfigured: isSheetsConfigured(),
    isAuthenticated: isAuthenticated()
  });
});

// Retry sync to Google Drive
app.post('/api/receipts/:id/sync', async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.syncedToDrive) {
      return res.json({ success: true, message: 'Already synced to Google Drive' });
    }

    const driveResult = await uploadToDrive(receipt.localPath, receipt.originalName, receipt.mimeType);

    receipt.driveFileId = driveResult.id;
    receipt.driveLink = driveResult.webViewLink;
    receipt.syncedToDrive = true;

    await saveReceipt(receipt);

    res.json({ success: true, receipt, message: 'Successfully synced to Google Drive!' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync to Google Drive' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 HSA Receipt Tracker API running on http://localhost:${PORT}`);
    console.log(`📁 Uploads stored in: ${uploadsDir}`);
  });
}

export default app;
