/**
 * This is an example of how to use the WoltCibusLoader class.
 */

import { CronJob } from "cron";
import dotenv from "dotenv";
import { WoltCibusLoader } from "./WoltCibusLoader";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Xvfb = require("xvfb");

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
  const xvfb = new Xvfb({
    displayNum: 1,
    reuse: false,
    silent: false,
    timeout: 5000,
    xvfb_args: ["-screen", "0", "1920x1080x24", "-ac", "-noreset"],
  });

  xvfb.startSync();

  console.log("Display started on:", xvfb._display);
  console.log(JSON.stringify(process.env, null, 2));

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
    allowCreditCardCharge: false,
    dryRun: true,
    shouldReedemCode: true,
    balanceToLoad: 20,
    puppeteerLaunchOptions: {
      headless: false,
      slowMo: 50,
      args: ["--no-sandbox", "--disable-setuid-sandbox", `--display=${xvfb._display}`],
      executablePath: "/usr/bin/chromium",
      env: {
        DISPLAY: `:1`,
      },
    },
  });

  const job = CronJob.from({
    cronTime: "0 17 * * 4" /* every Thursday at 17:00 */,
    onTick: async () => {
      await woltCibusLoader.loadRemainingCibusBalanceToWolt();
    },
    start: true,
    timeZone: "Asia/Jerusalem",
    runOnInit: true,
  });

  job.start();
})();
