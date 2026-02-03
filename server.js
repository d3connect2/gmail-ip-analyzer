/**
 * Gmail IP Analyzer - Backend
 * Connects to Gmail via IMAP, extracts sender IPs from Received headers,
 * fetches IP info from ip-api.com, and marks emails as read.
 */

const express = require('express');
const cors = require('cors');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// ip-api.com free tier: HTTP only, 45 req/min
const IP_API_BASE = 'http://ip-api.com/json';
const RATE_LIMIT_DELAY_MS = 1500; // ~40/min to stay under 45

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Extract sender IP from email raw headers.
 * Looks at Received lines; the last one typically contains the originating IP in [x.x.x.x].
 * Example: Received: from weforum.pro (virl-dev-innovate.cisco.com. [185.174.29.12])
 */
function extractSenderIp(rawHeaders) {
  const receivedLines = rawHeaders
    .split(/\r?\n/)
    .filter((line) => /^Received:\s/i.test(line));
  // IPv4 in brackets (last occurrence in last Received is usually the sender)
  const ipV4Regex = /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/g;
  let lastIp = null;
  for (const line of receivedLines) {
    let m;
    while ((m = ipV4Regex.exec(line)) !== null) lastIp = m[1];
  }
  return lastIp || null;
}

/**
 * Fetch IP info from ip-api.com (JSON).
 * Free API: http only, 45 requests/minute.
 */
function fetchIpInfo(ip) {
  return new Promise((resolve, reject) => {
    const url = `${IP_API_BASE}/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,as,query`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Delay helper for rate limiting ip-api.com
 */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Open Spam folder and fetch emails (unread by default), then mark as read.
 */
app.post('/api/analyze', async (req, res) => {
  const { email, appPassword, maxEmails = 50 } = req.body || {};

  if (!email || !appPassword) {
    return res.status(400).json({ error: 'Email and app password are required.' });
  }

  const imap = new Imap({
    user: email,
    password: appPassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }, // allow self-signed certs (e.g. corporate proxy)
  });

  const results = [];
  const ipCache = new Map(); // avoid duplicate API calls for same IP

  const openSpam = (cb) => {
    imap.openBox('[Gmail]/Spam', false, cb);
  };

  imap.once('ready', () => {
    openSpam((err, box) => {
      if (err) {
        imap.end();
        return res.status(500).json({ error: 'Failed to open Spam folder', detail: err.message });
      }

      // Fetch unread emails (or all if you prefer)
      imap.search(['UNSEEN'], (err, uids) => {
        if (err) {
          imap.end();
          return res.status(500).json({ error: 'Search failed', detail: err.message });
        }

        const toFetch = uids.slice(-Math.min(maxEmails, uids.length));
        if (toFetch.length === 0) {
          imap.end();
          return res.json({ message: 'No unread emails.', emails: [] });
        }

        const fetchOpts = { bodies: '', struct: true };
        const f = imap.fetch(toFetch, fetchOpts);

        let processed = 0;
        const expected = toFetch.length;

        f.on('message', (msg) => {
          let raw = '';
          let uid = null;

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => (raw += chunk.toString('utf8')));
          });

          msg.once('attributes', (attrs) => {
            uid = attrs.uid;
          });

          msg.once('end', async () => {
            try {
              const senderIp = extractSenderIp(raw);
              const parsed = await simpleParser(raw);
              const subject = parsed.subject || '(no subject)';
              const from = parsed.from?.text || '';
              const date = parsed.date ? parsed.date.toISOString() : '';

              let ipInfo = null;
              if (senderIp) {
                if (ipCache.has(senderIp)) {
                  ipInfo = ipCache.get(senderIp);
                } else {
                  await delay(RATE_LIMIT_DELAY_MS);
                  try {
                    ipInfo = await fetchIpInfo(senderIp);
                    ipCache.set(senderIp, ipInfo);
                  } catch (apiErr) {
                    ipInfo = { status: 'fail', message: apiErr.message || 'Lookup failed' };
                  }
                }
              }

              results.push({
                uid,
                subject,
                from,
                date,
                senderIp: senderIp || null,
                ipInfo: ipInfo || null,
              });
            } catch (e) {
              console.error('Message parse error:', e);
            }

            processed++;
            if (processed === expected) {
              // Mark all processed emails as read in one call, then close
              imap.addFlags(toFetch, ['\\Seen'], (addErr) => {
                if (addErr) console.error('Mark read error:', addErr);
                imap.end();
              });
            }
          });
        });

        f.once('error', (err) => {
          imap.end();
          res.status(500).json({ error: 'Fetch error', detail: err.message });
        });
      });
    });
  });

  imap.once('error', (err) => {
    res.status(500).json({ error: 'IMAP error', detail: err.message });
  });

  imap.once('end', () => {
    res.json({ message: `Processed ${results.length} email(s).`, emails: results });
  });

  imap.connect();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Gmail IP Analyzer server running at http://localhost:${PORT}`);
});
