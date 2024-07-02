/**
 * This is an example of how to use the WoltCibusLoader.
 * Assumed to be run on docker container with chromium installed. (see Dockerfile)
 * Provide the following environment variables in the .env file:
 * WOLT_EMAIL - Wolt user email
 * CIBUS_USERNAME - Cibus username
 * CIBUS_PASSWORD - Cibus password
 * CIBUS_COMPANY - Cibus company name
 * TELEGRAM_BOT_TOKEN - Telegram bot token
 * TELEGRAM_USER_CHAT_ID - Telegram user chat id
 */

import { CronJob } from "cron";
import dotenv from "dotenv";
import { WoltCibusLoader } from "./WoltCibusLoader";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

if (
  !process.env.WOLT_EMAIL ||
  !process.env.CIBUS_USERNAME ||
  !process.env.CIBUS_PASSWORD ||
  !process.env.CIBUS_COMPANY
) {
  console.log(JSON.stringify(process.env, null, 2));
  throw new Error("Please provide WOLT_EMAIL, CIBUS_USERNAME, CIBUS_PASSWORD and CIBUS_COMPANY in the .env file.");
}

(async function () {
  const woltCibusLoader = new WoltCibusLoader({
    woltEmail: process.env.WOLT_EMAIL,
    cibusScraperOptions: {
      username: process.env.CIBUS_USERNAME,
      password: process.env.CIBUS_PASSWORD,
      company: process.env.CIBUS_COMPANY,
      silent: true,
      puppeteerLaunchOptions: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: "/usr/bin/chromium",
      },
    },
    telegramBot: {
      token: process.env.TELEGRAM_BOT_TOKEN,
      userChatId: Number(process.env.TELEGRAM_USER_CHAT_ID),
    },
    allowCreditCardCharge: false,
    maxCreditCardCharge: 50,
    balanceToLoad: 50,
    dryRun: false,
    shouldReedemCode: true,
    puppeteerLaunchOptions: {
      headless: true,
      slowMo: 50,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: "/usr/bin/chromium",
    },
  });

  const job = CronJob.from({
    cronTime: "0 16 * * 4" /* every Thursday at 16:00 */,
    onTick: async () => {
      await woltCibusLoader.loadRemainingCibusBalanceToWolt();
    },
    start: true,
    timeZone: "Asia/Jerusalem",
    runOnInit: true,
  });

  job.start();
})();
