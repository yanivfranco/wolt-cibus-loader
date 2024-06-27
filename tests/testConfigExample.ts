import { WoltCibusLoaderConfig } from "../src/types";

export const testConfig: WoltCibusLoaderConfig = {
  woltEmail: "",
  cibusScraperOptions: {
    username: "",
    password: "",
    company: "",
    silent: true,
    puppeteerLaunchOptions: {
      headless: false,
    },
  },

  shouldPassBalance: false,
  // testRun: true,
  balanceToLoad: 20,
  shouldReedemCode: true,
  puppeteerLaunchOptions: {
    headless: false,
    slowMo: 50,
    defaultViewport: { width: 1100, height: 800 },
  },
};
