import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
];

// Token storage path
const TOKEN_PATH = process.env.VERCEL === '1'
    ? '/tmp/oauth_tokens.json'
    : path.join(__dirname, '..', 'data', 'oauth_tokens.json');

// Get OAuth2 client
const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';

    if (!clientId || !clientSecret) {
        throw new Error('OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// Generate auth URL for user to login
export const getAuthUrl = () => {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Always show consent screen to get refresh token
    });
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code) => {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens
    saveTokens(tokens);

    return tokens;
};

// Save tokens to file
const saveTokens = (tokens) => {
    const dataDir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ OAuth tokens saved');
};

// Load tokens from file
export const loadTokens = () => {
    if (!fs.existsSync(TOKEN_PATH)) {
        return null;
    }
    try {
        const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading tokens:', error);
        return null;
    }
};

// Get authenticated OAuth2 client
export const getAuthenticatedClient = async () => {
    const tokens = loadTokens();
    if (!tokens) {
        return null;
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.log('🔄 Refreshing expired OAuth token...');
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            saveTokens(credentials);
            oauth2Client.setCredentials(credentials);
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return null;
        }
    }

    return oauth2Client;
};

// Check if user is authenticated
export const isAuthenticated = () => {
    const tokens = loadTokens();
    return tokens !== null && tokens.access_token !== undefined;
};

// Clear tokens (logout)
export const clearTokens = () => {
    if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('✅ OAuth tokens cleared');
    }
};
