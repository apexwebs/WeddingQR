import QrScanner from "https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js";
QrScanner.WORKER_PATH = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js';

const video = document.getElementById('video');
const resultDiv = document.getElementById('result');

const scanner = new QrScanner(video, result => {
  console.log('decoded:', result);
  resultDiv.textContent = result;
  // optionally send fetch to server to mark checkin automatically
  fetch(result)
    .then(r => r.text())
    .then(text => {
      resultDiv.textContent = text;
    })
    .catch(err => {
      resultDiv.textContent = 'error: ' + err;
    });
  scanner.stop();
});

scanner.start();