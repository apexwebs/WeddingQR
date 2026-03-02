import express from 'express';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// compute __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// lowdb setup
// On serverless hosts like Vercel the project directory is read-only.
// Use the OS temp directory for writes (ephemeral) when running in that environment.
import os from 'os';

const defaultFile = path.join(__dirname, '..', 'data', 'db.json');
const file = process.env.VERCEL && process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'db.json')
  : defaultFile;

console.log('using database file:', file);

const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  // if running on serverless and temp file doesn't exist, seed it from default data
  if (process.env.VERCEL === '1' && !db.data) {
    try {
      const defaultDb = await (async () => {
        const f = new JSONFile(defaultFile);
        const tmp = new Low(f);
        await tmp.read();
        return tmp.data;
      })();
      db.data = defaultDb || { guests: [] };
    } catch {
      db.data = { guests: [] };
    }
  }
  db.data ||= { guests: [] };
  try {
    await db.write();
  } catch (err) {
    // ignore write errors during startup; they'll be handled later
    console.warn('initial db write failed', err.message);
  }
}
initDb();

// list guests
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.guests);
});

// helper to compute base URL (allows override via env)
function makeBaseUrl(req) {
  if (process.env.BASE_URL) {
    // strip trailing slash if present
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  let protocol = req.protocol;
  // when in production we prefer https to avoid mixed-content issues
  if (process.env.NODE_ENV === 'production' && protocol === 'http') {
    protocol = 'https';
  }
  return `${protocol}://${req.get('host')}`;
}

// create guest
router.post('/', async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).send('name required');
  if (!phone) return res.status(400).send('phone required');

  const id = nanoid();
  const guest = { id, name, phone, checkedIn: false };
  db.data.guests.push(guest);
  try {
    await db.write();
  } catch (err) {
    console.error('write failed', err);
    return res.status(503).json({ error: 'database write failed (read-only filesystem?)' });
  }

  // generate QR code pointing to checkin URL
  const url = `${makeBaseUrl(req)}/guests/${id}/checkin`;
  const qr = await QRCode.toDataURL(url);
  res.json({ guest, qr, url });
});

// get QR code image (redirect to data URI or send data)
router.get('/:id/qr', async (req, res) => {
  await db.read();
  const guest = db.data.guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).send('not found');
  const url = `${makeBaseUrl(req)}/guests/${guest.id}/checkin`;
  const qr = await QRCode.toDataURL(url);
  const data = qr.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(data, 'base64');
  res.type('png').send(buf);
});

// checkin endpoint that marks guest as checked in
router.get('/:id/checkin', async (req, res) => {
  await db.read();
  const guest = db.data.guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).send('not found');
  if (guest.checkedIn) {
    return res.send('already checked in');
  }
  guest.checkedIn = true;
  await db.write();
  res.send(`Thanks ${guest.name}, you are checked in!`);
});

// get the full check-in URL for a guest (for WhatsApp etc)
router.get('/:id/qr-url', async (req, res) => {
  await db.read();
  const guest = db.data.guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).json({ error: 'not found' });
  const url = `${makeBaseUrl(req)}/guests/${guest.id}/checkin`;
  res.json({ url });
});

// reset check-in status
router.post('/:id/reset', async (req, res) => {
  await db.read();
  const guest = db.data.guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).send('not found');
  guest.checkedIn = false;
  try {
    await db.write();
  } catch (err) {
    console.error('write failed', err);
    return res.status(503).json({ error: 'database write failed' });
  }
  res.json({ status: 'reset', guest });
});

// delete a guest
router.delete('/:id', async (req, res) => {
  await db.read();
  const idx = db.data.guests.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).send('not found');
  const removed = db.data.guests.splice(idx, 1)[0];
  try {
    await db.write();
  } catch (err) {
    console.error('write failed', err);
    return res.status(503).json({ error: 'database write failed' });
  }
  res.json({ status: 'deleted', guest: removed });
});

export default router;