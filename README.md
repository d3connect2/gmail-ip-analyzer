# Gmail IP Analyzer

Webapp (HTML, CSS, JavaScript + Node backend) that:

- Lets you sign in with **Gmail** and an **App Password**
- Fetches unread emails from your **Spam** folder
- **Extracts sender IP** from `Received:` headers (e.g. `Received: from weforum.pro (virl-dev-innovate.cisco.com. [185.174.29.12])` → `185.174.29.12`)
- Looks up **each IP** using [ip-api.com](https://ip-api.com/docs) (country, city, ISP, org, lat/lon, etc.)
- **Marks every processed email as read**

## Setup

1. **Node.js** (v14+).

2. Install dependencies:

   ```bash
   cd gmail-ip-analyzer
   npm install
   ```

3. Create a Gmail **App Password** (not your normal password):
   - [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Use it in the webapp when prompted.

4. Start the server:

   ```bash
   npm start
   ```

5. Open **http://localhost:3000** in your browser.

## Usage

- Enter your **Gmail address** and **App Password**.
- Set **Max emails** (default 20). Only unread emails in Spam are processed.
- Click **Fetch & Analyze Emails**.
- Each email is shown with its **sender IP** (from `Received` headers) and **ip-api.com** info (country, region, city, ISP, org, coordinates). Processed emails are marked as read.

## API

- **ip-api.com**: free tier, 45 requests/minute ([docs](https://ip-api.com/docs)). The app adds a short delay between lookups to stay under the limit.

## Deploy to Vercel (from GitHub)

1. Push this repo to GitHub (if you haven’t).
2. Go to [vercel.com/new](https://vercel.com/new), sign in, and **Import** your GitHub repo.
3. Leave **Root Directory** as `.` and **Build Command** empty (or `npm install`). **Output Directory** can stay empty.
4. Click **Deploy**. Vercel will detect the Express app and serve `public/` as static assets.
5. Your app will be live at `https://your-project.vercel.app`. Use **Max emails** (e.g. 10–20) to avoid timeouts on the free plan (≈10–60s limit).

## Project layout

- `public/` – frontend (index.html, styles.css, app.js); served by Vercel CDN
- `server.js` – Express server: IMAP (Gmail Spam), Received-header parsing, ip-api.com, mark as read
- `vercel.json` – routes `/api/*` to the Express serverless function
