import QrScanner from "https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js";
QrScanner.WORKER_PATH = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js';

const video = document.getElementById('video');
const resultDiv = document.getElementById('result');

const scanner = new QrScanner(video, result => {
  console.log('decoded:', result);
  resultDiv.textContent = result;

  // try to fetch the URL returned by the QR scanner
  fetch(result)
    .then(r => r.text())
    .then(text => {
      resultDiv.textContent = text;
    })
    .catch(err => {
      // display detailed message to help debugging
      resultDiv.innerHTML = `error: ${err} <br/><small>scanned URL: ${result}</small>`;
    });
  scanner.stop();
});

scanner.start();