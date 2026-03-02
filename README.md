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

Use any Node hosting provider or serve via PM2/Nginx. The app is now using ES modules, which matches Vercel's defaults; you should no longer see `ERR_REQUIRE_ESM` errors when deploying. Ensure the base URL in the QR codes matches the publicly reachable address when deployed.
