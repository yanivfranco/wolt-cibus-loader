import { CibusScraperOptions } from "cibus-scraper";
import { PuppeteerLaunchOptions } from "puppeteer";

export interface WoltCibusLoaderConfig {
  /**
   * Wolt user email
   */
  woltEmail: string;

  /**
   * Options for the cibus scraper in order to get current balance and login to the cibus website
   * Either the cibusScraperOptions or the balanceToLoad should be provided.
   */
  cibusScraperOptions?: CibusScraperOptions;

  /**
   * Cibus balance to load to Wolt.
   * If not provided, the balance will be fetched from the cibus website.
   */
  balanceToLoad?: number;

  /**
   * Whether the closest gift card price should be higher than the cibus balance.
   * This is useful if you have a credit card assosiated to your cibus account, and you want to avoid remaining balance in Cibus.
   */
  shouldPassBalance?: boolean;

  /**
   * Whether the code should be retrieved from the gift card mail and redeemed automatically.
   * default: true
   */
  shouldReedemCode?: boolean;

  /**
   * Function that returns the magic link from the login email received.
   * default: () => Promise<string> | string
   */
  getWoltLoginMagicLink?: () => Promise<string> | string;

  /**
   * Puppeteer launch options to be passed to the puppeteer.launch function
   */
  puppeteerLaunchOptions?: PuppeteerLaunchOptions;

  /**
   * If true, the flow will be executed without actually submitting the order, it will only log the submitted order details.
   */
  testRun?: boolean;
}
