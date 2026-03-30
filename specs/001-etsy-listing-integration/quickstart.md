# Quickstart: Etsy Craft Listing Uploader

**Feature**: 001-etsy-listing-integration
**Date**: 2026-03-20

## Prerequisites

1. **Node.js** (LTS version, 18+)
2. **npm** (comes with Node.js)
3. **An Etsy Developer Account** with a registered application at [etsy.com/developers/your-apps](https://www.etsy.com/developers/your-apps)

## Etsy App Setup

1. Go to [Your Etsy Apps](https://www.etsy.com/developers/your-apps) and create a new app (or use an existing one).
2. Note your **App API Key** (keystring).
3. Add a **Callback URL**: `http://localhost:3000/api/auth/callback`

## Local Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd etsy-listings

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Edit `.env.local` with your Etsy credentials:

```
ETSY_API_KEY=your_etsy_api_key_keystring_here
ETSY_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Flow

### 1. Connect to Etsy

Click the **"Connect to Etsy"** button. You'll be redirected to Etsy to authorize the app. After granting access, you'll be redirected back and see your shop name displayed.

### 2. Upload a Listing

Paste a JSON object into the text area. Minimum required fields:

```json
{
  "quantity": 1,
  "title": "Your Listing Title",
  "description": "A description of your product.",
  "price": 19.99,
  "who_made": "i_did",
  "when_made": "2020_2023",
  "taxonomy_id": 1
}
```

Click **"Upload Listing"** to create a draft on Etsy.

### 3. Batch Upload

Paste a JSON array of listing objects to upload multiple drafts at once:

```json
[
  {
    "quantity": 1,
    "title": "Listing One",
    "description": "Description one.",
    "price": 10.00,
    "who_made": "i_did",
    "when_made": "2020_2023",
    "taxonomy_id": 1
  },
  {
    "quantity": 2,
    "title": "Listing Two",
    "description": "Description two.",
    "price": 20.00,
    "who_made": "i_did",
    "when_made": "made_to_order",
    "taxonomy_id": 1
  }
]
```

### 4. Disconnect

Click **"Disconnect"** to clear stored tokens and unlink your Etsy account.

## Finding Your taxonomy_id

Use the Etsy Seller Taxonomy API to browse categories:

```
GET https://openapi.etsy.com/v3/application/seller-taxonomy/nodes
```

This returns a tree of categories with their `id` values. Use the appropriate `id` as the `taxonomy_id` for your listings.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ETSY_API_KEY` | yes | Your Etsy App API Key (keystring) from Your Apps |
| `ETSY_REDIRECT_URI` | yes | Must match the callback URL registered in your Etsy app |

## Troubleshooting

- **"Invalid state parameter"**: The OAuth flow timed out or was interrupted. Click "Connect to Etsy" again.
- **"Refresh token expired"**: Your session has been inactive for 90+ days. Click "Connect to Etsy" to re-authenticate.
- **"Missing required field"**: Check your JSON against the required fields listed above.
- **Token errors after server restart**: Tokens persist in `data/tokens.json`. If corrupted, delete the file and reconnect.
