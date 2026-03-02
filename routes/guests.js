const express = require('express');
const QRCode = require('qrcode');
const { nanoid } = require('nanoid');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const router = express.Router();

// lowdb setup
const file = path.join(__dirname, '..', 'data', 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= { guests: [] };
  await db.write();
}
initDb();

// list guests
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.guests);
});

// create guest
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).send('name required');

  const id = nanoid();
  const guest = { id, name, email: email || '', checkedIn: false };
  db.data.guests.push(guest);
  await db.write();

  // generate QR code pointing to checkin URL
  const url = `${req.protocol}://${req.get('host')}/guests/${id}/checkin`;
  const qr = await QRCode.toDataURL(url);
  res.json({ guest, qr });
});

// get QR code image (redirect to data URI or send data)
router.get('/:id/qr', async (req, res) => {
  await db.read();
  const guest = db.data.guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).send('not found');
  const url = `${req.protocol}://${req.get('host')}/guests/${guest.id}/checkin`;
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

module.exports = router;