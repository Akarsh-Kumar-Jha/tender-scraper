const express = require('express');
const cron = require('node-cron');
const { playwrightScraper } = require('./controllers/mahaTenderScrapper');
const { scrapGem } = require('./controllers/gemTender');
const { connectDB } = require('./config/db');
const fileUpload = require('express-fileupload');
const { getTenders } = require('./controllers/getTenders');

const app = express();



app.use(express.json());

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// 🔥 Health check
app.get('/', (req, res) => {
  res.send('Tender Scraper Running 🚀');
});


app.get('/getTenders',getTenders);

// 🔥 DB connect
connectDB();

let isRunning = false;

// 🔥 Timeout wrapper (VERY IMPORTANT)
const runWithTimeout = async (fn, timeoutMs = 5 * 60 * 1000) => {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
};

// 🔥 MAIN JOB
async function scraperJob() {

  if (isRunning) return console.log("⛔ Already running");

  isRunning = true;

  console.log("🚀 Scraper started...");

  try {

    await runWithTimeout(() =>
      playwrightScraper({ limit: 20 })
    );

    await runWithTimeout(() =>
      scrapGem({ maxPages: 10 })
    );

    console.log("✅ Scraper finished");

  } catch (err) {
    console.log("❌ Error:", err.message);
  } finally {
    isRunning = false;
  }
}

// CRON
cron.schedule('*/10 * * * *', () => {
  console.log("\n⏰ Cron triggered...");
  scraperJob();
});

// 🔥 First run (safe delay)
setTimeout(() => {
  scraperJob();
}, 5000);

// 🔥 Server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});