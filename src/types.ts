import { CibusScraperOptions } from "cibus-scraper";
import { ElementHandle, PuppeteerLaunchOptions } from "puppeteer";
import { JSONCredentials } from "./gmailClient";

export interface WoltCibusLoaderConfig {
  /**
   * Wolt user email
   */
  woltEmail: string;

  /**
   * Telegram bot configuration for login acknoledgement
   */
  telegramBot?: {
    token: string;
    userChatId: number;
  };

  /**
   * Gmail user credentials
   * If not provided, will try to load from the token.json file or fresh login will be required.
   */
  gmailUserCredentials?: JSONCredentials;

  /**
   * Function that returns the magic link from the login email received.
   * default: () => Promise<string> | string
   */
  getWoltLoginMagicLink?: () => Promise<string> | string;

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
   * Whether to find a gift card with price higher than the balance, charging the remaining balance with a credit card.
   * This is useful if you have a credit card assosiated to your cibus account, and you want to avoid remaining balance in Cibus.
   * default: false
   */
  allowCreditCardCharge?: boolean;

  /**
   * The max amount to charge with the credit card.
   * If no gift card is found in the given price range, the first lower price gift card will be used.
   * default: 50
   */
  maxCreditCardCharge?: number;

  /**
   * Whether the code should be retrieved from the gift card mail and redeemed automatically.
   * default: true
   */
  shouldReedemCode?: boolean;

  /**
   * Puppeteer launch options to be passed to the puppeteer.launch function
   */
  puppeteerLaunchOptions?: PuppeteerLaunchOptions;

  /**
   * If true, the flow will be executed without actually submitting the order, it will only log the submitted order details.
   */
  dryRun?: boolean;
}

export interface ClosestElement {
  element: ElementHandle<Element>;
  absDiff: number;
  price: number;
}
