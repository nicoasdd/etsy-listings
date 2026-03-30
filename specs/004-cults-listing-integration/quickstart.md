# Quickstart: Cults3D Listing Integration

**Feature**: 004-cults-listing-integration

## Prerequisites

Before using the Cults3D integration, you need:

1. **Existing setup**: The app is running with Etsy and ChatGPT connections working (features 001, 002, 003).
2. **Cults3D account with API access**: You have received API credentials (username and password) from Cults3D. See the [Cults3D API page](https://cults3d.com/en/pages/graphql) for details.
3. **S3-compatible cloud storage**: A bucket on Cloudflare R2, AWS S3, MinIO, or any S3-compatible provider with public read access enabled.

## Step 1: Configure Cloud Storage

Add the following to your `.env.local`:

```bash
# S3-compatible storage for file uploads
# Works with Cloudflare R2, AWS S3, MinIO, Backblaze B2, etc.
STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your_access_key_id
STORAGE_SECRET_ACCESS_KEY=your_secret_access_key
STORAGE_BUCKET=your-bucket-name
STORAGE_PUBLIC_URL=https://pub-your-hash.r2.dev
STORAGE_REGION=auto
```

### Cloudflare R2 Setup (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 Object Storage
2. Create a bucket (e.g., `etsy-listings-files`)
3. Enable public access on the bucket → note the public URL (e.g., `https://pub-xxx.r2.dev`)
4. Go to R2 → Manage R2 API Tokens → Create API token with Object Read & Write permissions
5. Copy the Access Key ID and Secret Access Key into `.env.local`
6. Set `STORAGE_ENDPOINT` to `https://<account-id>.r2.cloudflarestorage.com`
7. Set `STORAGE_REGION` to `auto`

## Step 2: Connect Cults3D

1. Start the app: `npm run dev`
2. Open `http://localhost:3000`
3. Find the "Cults3D" connection section
4. Enter your Cults3D API username and password
5. Click "Connect" — the app verifies your credentials and shows your account name

## Step 3: Generate Dual-Marketplace Listing

1. Ensure ChatGPT is connected (feature 002)
2. Upload a product image in the "Generate Listing from Image" section
3. Add an optional description
4. Click "Generate Listing"
5. Both Etsy and Cults3D field sets appear in separate sections

## Step 4: Complete the Cults3D Listing

1. Review and edit the AI-generated Cults3D fields (name, description, tags)
2. Upload preview images (the ChatGPT analysis image is pre-attached)
3. Upload 3D model files (STL, OBJ, 3MF, etc.)
4. Select a category from the dropdown (fetched from Cults3D)
5. Set the download price and currency
6. Optionally select subcategories, a license, and locale

## Step 5: Create the Listing

1. Click "Create Listing on Cults3D"
2. On success, a link to the new design on Cults3D is displayed
3. Optionally, also create the listing on Etsy from the same session

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cloud storage is not configured" | Check that all `STORAGE_*` environment variables are set in `.env.local` and restart the dev server |
| "Invalid Cults3D credentials" | Verify username/password on the [Cults3D GraphQL explorer](https://cults3d.com/graphiql) |
| "Failed to upload file to storage" | Check your storage credentials and that the bucket exists with write permissions |
| "Image URL is not accessible" (from Cults3D) | Ensure your storage bucket has public read access enabled |
| File upload rejected | Check file size (max 50 MB) and format (images: JPEG/PNG/WebP, models: STL/OBJ/3MF/STEP) |
