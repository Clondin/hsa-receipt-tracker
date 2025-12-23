# HSA Receipt Tracker

A medical receipt tracking application that automatically syncs uploaded receipts to **Google Drive** and logs details to **Google Sheets**.

## Features
- 📤 **Upload & Sync**: Upload receipts (Image/PDF) and automatically save them to a specific Google Drive folder.
- 📊 **Sheets Integration**: Automatically appends a new row to a Google Sheet for every upload.
- 🏷️ **Categorization**: Organize expenses by category (Doctor, Pharmacy, Vision, etc.).
- 📉 **Expense Tracking**: View total expenses and breakdown by category.
- 📱 **Modern UI**: limit glassmorphism design, fully responsive.

## Prerequisites

1.  **Node.js**: Install Node.js (v18+ recommended).
2.  **Google Cloud Service Account**:
    - Create a project in [Google Cloud Console](https://console.cloud.google.com/).
    - Enable **Google Drive API** and **Google Sheets API**.
    - Create a Service Account and download the JSON key file.
    - **Share** your target Google Drive Folder and Google Sheet with the Service Account email address (found in the JSON).

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd hsa-receipt-tracker
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory:

    ```env
    # Service Account Credentials (from JSON file)
    GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

    # Target IDs
    GOOGLE_DRIVE_FOLDER_ID=your_folder_id
    GOOGLE_SHEET_ID=your_sheet_id

    # App Config
    PORT=3001
    CLIENT_URL=http://localhost:5173
    ```

    > **Note**: For `GOOGLE_PRIVATE_KEY`, ensure you copy the entire string including `\n` characters. If pasting directly, wrap it in quotes.

## Running Locally

1.  **Start Development Server**:
    Run both client and server concurrently:
    ```bash
    npm run dev
    ```

2.  **Access the App**:
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment (Vercel)

1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` to deploy.
3.  Add the environment variables in the Vercel Project Settings.

## Google Sheets Structure

The application expects to append rows. It's recommended to add a header row to your Sheet:
`Date | Provider | Amount | Category | Notes | Drive Link | Receipt ID`
