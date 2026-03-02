# Wedding QR Check-in

Simple Node.js/Express app that allows:

- Adding guests and generating QR codes
- Scanning QR codes using a phone/tablet camera
- Marking guests as checked in

## Setup

```bash
cd e:\weddingQR
npm install
# Node 14+ is required since the project uses ES modules (`"type": "module"` in package.json).
npm run dev        # or npm start
```

App listens on port 3000 by default. Visit `http://localhost:3000`.

## Workflow

1. Add a guest via **Manage Guests** page. A QR code URL is returned in the console and the guest list updates.
2. Print or share the QR code URL (either open the `/guests/:id/qr` link or the data URL).
3. At the venue, open **Scan QR Code** page on a phone/tablet and scan. The app will call the checkin URL and display a confirmation message.

## Deployment

Use any Node hosting provider or serve via PM2/Nginx. The app is now using ES modules, which matches Vercel's defaults; you should no longer see `ERR_REQUIRE_ESM` errors when deploying.

### Base URL configuration

By default the server computes the QR code URL from `req.protocol` and `req.get('host')`. On Vercel this yields the deployment domain automatically, but if you ever need to generate codes offline or behind a proxy you can force a value with the `BASE_URL` environment variable. For example:

```bash
# set on Vercel
vercel env add BASE_URL production
# set locally (PowerShell):
$env:BASE_URL='https://wedding-qr-beta.vercel.app'
```

The variable should include the protocol and host, e.g. `https://example.com`. The trailing slash is ignored. With `BASE_URL` set, the server will always use it when creating check‑in links.

Unless you regenerate them from the deployed site, any QR codes created during local development will still point at `http://localhost:3000` and will not work when scanned from a phone. (That is the most likely reason you saw `Failed to fetch` in the scan page.)

### Scanning behavior

The scanner page now echoes the scanned URL beneath error messages, so you can quickly tell whether it’s attempting to contact the right domain. A common pitfall on HTTPS deployments is **mixed content**: if your QR code URL starts with `http://` but the scan page is loaded via `https://`, the browser will block the fetch and you'll see `TypeError: Failed to fetch`. To avoid this, the server now forces `https` on production (and respects a `BASE_URL` override). 

A typical successful scan will show the “Thanks … you are checked in!” text; if you see a localhost URL or another unfamiliar host, delete the guest and add them again from the live server.

### Persistence on deployments

The current implementation uses `lowdb` with a JSON file located under `data/db.json`. That works fine on your local machine, but most serverless platforms (including Vercel) mount the repository read‑only. To allow the site to *simulate* guest creation on Vercel, the code now writes to the operating system temporary directory (`/tmp` on Linux). **Data written there is ephemeral**: it will disappear when the function instance is recycled or a new build is deployed. This means:

- Guests added via the deployed site may vanish after a few hours or when Vercel spins down the instance.
- You will typically be unable to add guests at all if the temp directory cannot be written; the server will return a `503` with a message about a read-only filesystem.

For production use, switch to a proper database (SQLite, PostgreSQL, MongoDB, Vercel KV, etc.) or host your app on a server that allows persistent writes. Until then, treat the deployed version as *read-only* and add guests locally during preparation if you need stable data.

