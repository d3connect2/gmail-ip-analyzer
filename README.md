# Gmail IP Analyzer

Webapp (HTML, CSS, JavaScript + Node backend) that:

- Lets you sign in with **Gmail** and an **App Password**
- Fetches unread emails from your INBOX
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
- Set **Max emails** (default 20). Only unread emails are processed.
- Click **Fetch & Analyze Emails**.
- Each email is shown with its **sender IP** (from `Received` headers) and **ip-api.com** info (country, region, city, ISP, org, coordinates). Processed emails are marked as read.

## API

- **ip-api.com**: free tier, 45 requests/minute ([docs](https://ip-api.com/docs)). The app adds a short delay between lookups to stay under the limit.

## Project layout

- `public/` – frontend (index.html, styles.css, app.js)
- `server.js` – Express server: IMAP (Gmail), Received-header parsing, ip-api.com calls, mark as read
