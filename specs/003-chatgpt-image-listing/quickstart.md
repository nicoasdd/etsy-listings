# Quickstart: ChatGPT Image-Based Listing Generator

**Feature**: 003-chatgpt-image-listing
**Date**: 2026-03-20

## Prerequisites

1. The app is running locally (`npm run dev` at `http://localhost:3000`)
2. Your Etsy account is connected (feature 001) — needed only for creating listings on Etsy
3. Your ChatGPT account is connected (feature 002) — **required** for generating listing fields

## Using the Feature

### 1. Navigate to Generate Listing

After connecting your ChatGPT account, a new "Generate Listing from Image" section appears on the main page.

### 2. Upload a Product Image

- Click the upload area or drag-and-drop a product photo
- Accepted formats: JPEG, PNG, WebP (max 20 MB)
- A preview of the uploaded image is shown for confirmation

### 3. Add a Brief Description (Optional)

- Type a short description in the text field (e.g., "Handmade ceramic mug with blue glaze, 12oz")
- This gives ChatGPT additional context for better results
- If left empty, ChatGPT generates based on the image alone

### 4. Generate Listing Fields

- Click **"Generate Listing"**
- Wait for ChatGPT to analyze the image and return the fields (typically 10-30 seconds)
- A loading indicator shows while processing

### 5. Review and Edit

Once generated, you'll see all fields in an editable form:
- **Title** — with character counter (max 140)
- **Description** — full text editor
- **Tags** — chip/tag list (max 13, each max 20 chars)
- **Materials** — editable list
- **Styles** — up to 2 style descriptors
- **Suggested Category** — plain-text guidance for choosing the right Etsy taxonomy

If unsatisfied, click **"Regenerate"** to get a new set of fields.

### 6. Create a Listing on Etsy (Optional)

To create a draft listing, fill in the remaining required fields:
- **Price** — your selling price
- **Quantity** — stock count
- **Who Made** — select: I did / Someone else / Collective
- **When Made** — select the appropriate time period
- **Taxonomy ID** — the Etsy category number (use the suggested category as guidance)

Then click **"Create Listing on Etsy"** to submit.

### 7. Copy as JSON (Alternative)

Click **"Copy as JSON"** to copy the generated fields as a JSON object to your clipboard. You can paste this into the existing JSON upload area or save it for later.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not connected to ChatGPT" | Connect your ChatGPT account in the ChatGPT Status section |
| Generation timeout | Try again — ChatGPT may be under heavy load |
| Malformed response error | Click Retry — occasionally ChatGPT's format varies |
| Image rejected | Check format (JPEG/PNG/WebP only) and size (max 20 MB) |
| "Create Listing" button disabled | Connect your Etsy account first |
