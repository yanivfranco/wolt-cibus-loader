import { CibusScraper } from "cibus-scraper";
import moment from "moment";
import { ElementHandle, Frame, Page, executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import pluginStealth from "puppeteer-extra-plugin-stealth";
import { woltGiftCardUrl, woltHomepageUrl } from "./consts";
import { GmailClient } from "./gmailClient";
import { doWithRetries, getTestIdSelector, waitAndClick, waitAndType } from "./helpers";
import { logger } from "./logger";
import { WoltCibusLoaderConfig } from "./types";

export class WoltCibusLoader {
  gmailClient: GmailClient = new GmailClient();

  constructor(private config: WoltCibusLoaderConfig) {
    puppeteer.use(pluginStealth());
  }

  async loadRemainingCibusBalanceToWolt() {
    logger.info("Flow started");
    logger.info("Getting current cibus balance");
    const cibusBalance =
      this.config.balanceToLoad !== undefined ? this.config.balanceToLoad : await this.getCibusBalance();
    if (cibusBalance <= 0) {
      throw new Error("Cibus balance is 0, nothing to load to Wolt.");
    }

    logger.info({ cibusBalance }, "Got Cibus balance successfully");
    logger.info("Logging in to Wolt");

    const options = this.createPuppeteerLaunchOptions();
    const browser = await puppeteer.launch(options);
    try {
      const page = await browser.newPage();
      await page.goto(woltHomepageUrl);
      await this.login(page);

      logger.info("Logged in successfully");

      page.goto(woltGiftCardUrl);
      await page.waitForNavigation();
      await this.rejectContinueOrderModal(page);
      const { element, price } = await this.getGiftCardElementClosestToBalance(page, cibusBalance);

      logger.info({ cibusBalance, price }, "Found the element with price closest to the balance");

      await this.addGiftCardToCartAndProceedToPayment(page, element);
      await this.validateOrder(page, cibusBalance, price);

      logger.info("Order validated successfully, proceeding to payment");

      await this.selectCibusPaymentMethod(page);
      const beforeOrderSubmit = await this.submitOrderWithCibusChallenge(page, price, cibusBalance);
      if (!beforeOrderSubmit && this.config.testRun) {
        logger.info(
          {
            orderPrice: price,
            cibusBalance,
          },
          "Test run enabled, finishing the flow without submitting the order."
        );
        return;
      }

      const orderNumber = await this.validateOrderSuccess(page);

      logger.info({ receipt: `https://wolt.com/en/me/order-history/${orderNumber}` }, "Order submitted successfully!");

      if (this.config.shouldReedemCode !== false) {
        await this.redeemCode(page, beforeOrderSubmit);
      }

      return orderNumber;
    } catch (error: unknown | Error) {
      const typedError = error as Error;
      logger.error({ error: typedError?.message, stack: typedError?.stack }, "Error occurred during the flow.");
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Redeem the gift card code from the email.
   */
  private async redeemCode(page: Page, beforeOrderSubmit: moment.Moment) {
    logger.info("Code redemption is enabled, starting the code redemption flow.");

    await page.goto("https://wolt.com/en/me/redeem-code");
    const code = await doWithRetries(
      () => this.gmailClient.getCodeFromGiftCardEmail(beforeOrderSubmit),
      "Could not get the code from the email.",
      5
    );

    logger.info({ code }, "Got the code from the email successfully. Redeeming...");

    await waitAndType(page, getTestIdSelector("redeem-code-input"), code);
    const redeemButton = await page.waitForSelector(`[data-test-id="redeem-code-input"]+button`);

    return new Promise<void>(async (resolve, reject) => {
      page.on("response", async (response) => {
        if (
          response.url().includes("credit_codes/consume") &&
          response.request().method() === "POST" &&
          response.ok()
        ) {
          resolve();
          logger.info("Code redeemed successfully");
        }
      });

      await redeemButton.click();

      // reject if the code redemption fails after 30 seconds
      setTimeout(() => {
        reject(new Error("Code redemption failed, timeout exceeded"));
      }, 30000);
    });
  }

  /**
   * Validate the order success in the Wolt order summary.
   */
  private async validateOrderSuccess(page: Page) {
    await page.waitForNavigation();
    const url = page.url();
    if (!url.includes("/me/order-tracking")) {
      throw new Error("Could not find the order success page, probably order failed.");
    }

    const orderNumber = url.split("/").pop();
    return orderNumber;
  }

  /**
   * Adds the gift card to the cart and proceeds to the payment.
   */
  private async addGiftCardToCartAndProceedToPayment(page: Page, element: ElementHandle<Element>) {
    await element.click();
    await waitAndClick(page, getTestIdSelector("product-modal.submit"));
    await waitAndClick(page, getTestIdSelector("cart-view-button"));
    await waitAndClick(page, getTestIdSelector("CartViewNextStepButton"));
  }

  /**
   * Submit the order.
   * The cibus challenge iframe will be shown after clicking the submit order button.
   * The user will be logged in to the cibus website and the price will be validated.
   * If the price is correct, the order will be submitted.
   */
  private async submitOrderWithCibusChallenge(page: Page, price: number, cibusBalance: number) {
    await waitAndClick(page, getTestIdSelector("BackendPricing.SendOrderButton"));
    const cibusIframe = await page.waitForSelector("iframe[name='cibus-challenge']");
    const cibusIframeContent = await cibusIframe.contentFrame();
    await this.loginToCibusChallenge(cibusIframeContent);
    await this.validateCibusPrice(cibusIframeContent, price, cibusBalance);

    // if test run is enabled, return null and do not submit the order
    if (this.config.testRun) {
      return null;
    }

    const beforeOrderSubmit = moment();
    await waitAndClick(cibusIframeContent, "#btnPay");

    return beforeOrderSubmit;
  }

  /**
   * If the user has a pending order, Wolt will show a modal asking if the user wants to continue the order.
   * This function will reject the modal and continue the flow.
   */
  private async rejectContinueOrderModal(page: Page) {
    const rejectContinueOrderButton = await page
      .waitForSelector(getTestIdSelector("restore-order-modal.reject"), {
        timeout: 5000,
      })
      .catch(() => {});
    if (rejectContinueOrderButton) {
      rejectContinueOrderButton.click();
    }
  }

  /**
   * Create the puppeteer launch options with the default options and the provided options from the config.
   */
  private createPuppeteerLaunchOptions() {
    return {
      defaultViewport: { width: 1100, height: 800 }, // essential for functionallity (narrower viewport tranform to mobile view and breaks the flow)
      args: [
        "--disable-web-security", // essential for iframe content access
        "--disable-features=IsolateOrigins,site-per-process", // essential for iframe content access
        ...(this.config.puppeteerLaunchOptions?.args || []),
      ],
      ...this.config.puppeteerLaunchOptions,
      executablePath: executablePath(),
    };
  }

  /**
   * Select the cibus payment method in the Wolt payment methods modal.
   * If the cibus payment method is already selected, close the modal.
   */
  private async selectCibusPaymentMethod(page: Page) {
    await waitAndClick(page, getTestIdSelector("PaymentMethods.SelectedPaymentMethod"));

    const cibusPaymentMethod = await page.waitForSelector("button[data-payment-method-id='cibus']");
    if (
      cibusPaymentMethod &&
      (await cibusPaymentMethod.evaluate((el) => el.getAttribute("data-selected") === "true"))
    ) {
      // already selected cibus payment method, close the modal
      await waitAndClick(page, getTestIdSelector("modal-close-button"));
    } else {
      // select the cibus payment method
      await cibusPaymentMethod.click();
    }
  }

  /**
   * Validate the price in the cibus iframe. (yes, again, just to be sure)
   */
  private async validateCibusPrice(frame: Frame, price: number, cibusBalance: number) {
    const elements = await frame.$$("#hSubTitle");
    if (elements.length !== 1) {
      throw new Error("Could not find the price element in the cibus iframe");
    }

    const cibusPrice = await frame.evaluate((el) => el.textContent, elements[0]);
    const priceNumber = parseFloat(cibusPrice.replace("₪", ""));
    if (priceNumber !== price) {
      throw new Error(`Price validation failed, expected price: ${price}, got: ${priceNumber}`);
    }

    const balanceElement = await frame.$("#divUserInfo > big");
    const balanceString = (await frame.evaluate((el) => el.textContent, balanceElement)).replace("₪", "");
    const balanceFromIframe = parseFloat(balanceString);
    if (balanceFromIframe !== cibusBalance) {
      throw new Error(`Balance validation failed, expected balance: ${cibusBalance}, got: ${balanceFromIframe}`);
    }
  }

  /**
   * Login to the cibus challenge iframe.
   */
  private async loginToCibusChallenge(frame: Frame) {
    await waitAndType(frame, "#txtUserName", this.config.cibusScraperOptions.username);
    await waitAndType(frame, "#txtPassword", this.config.cibusScraperOptions.password);
    await waitAndType(frame, "#txtCompany", this.config.cibusScraperOptions.company);
    await waitAndClick(frame, "#btnSubmit");
  }

  /**
   * Validate the order in the Wolt order summary.
   */
  private async validateOrder(page: Page, cibusBalance: number, price: number) {
    await page.waitForSelector(getTestIdSelector("BackendPricing.AmountRow"));
    const items = await page.$$(`[data-test-id="BackendPricing.AmountRow"] dd`);
    if (items.length !== 1) {
      throw new Error("Order validation failed, there should be exactly one item in the order.");
    }

    const text = await page.evaluate((el) => el.textContent, items[0]);
    const totalPrice = parseFloat(text.replace("₪", "").trim());

    if (totalPrice !== price) {
      throw new Error(`Order validation failed, expected price: ${price}, got: ${totalPrice}`);
    }

    if (totalPrice > cibusBalance && !this.config.shouldPassBalance) {
      throw new Error(`Order validation failed, expected price not higher than: ${price}, got: ${totalPrice}`);
    }
  }

  /**
   * Login to the Wolt website. The login is done by sending an email with a magic link.
   * If the getWoltLoginMagicLink function is provided in the config, it will be used to get the magic link.
   * Otherwise, the magic link will be fetched using the getWoltLoginMagicLink function from the gmailClient.
   */
  private async login(page: Page) {
    await waitAndClick(page, getTestIdSelector("UserStatus.Login"));
    await waitAndType(page, getTestIdSelector("MethodSelect.EmailInput"), this.config.woltEmail);
    const beforeEmailSent = moment();
    await waitAndClick(page, getTestIdSelector("StepMethodSelect.NextButton"));
    await page.waitForSelector(getTestIdSelector("EmailSent.Resend")).catch(() => {
      throw new Error(
        "Could not find the email sent message, probably the email is invalid or not registered in Wolt."
      );
    });

    let loginMagicLink: string;
    if (this.config.getWoltLoginMagicLink) {
      logger.info("Email sent, getting magic link from provided getWoltLoginMagicLink function");
      loginMagicLink = await this.config.getWoltLoginMagicLink();
    } else {
      logger.info("Email sent, waiting for magic link using telegram bot");
      loginMagicLink = await doWithRetries(() => this.gmailClient.getWoltLoginMagicLink(beforeEmailSent));
    }

    await page.goto(loginMagicLink);
    await page.waitForNavigation();
    await page.waitForSelector(getTestIdSelector("UserStatusDropdown")).catch(() => {
      throw new Error("Could not find the UserStatusDropdown, probably the login failed.");
    });
  }

  /**
   * Get the gift card element with the price closest to the balance.
   * If shouldPassBalance is true, the price can be higher than the balance.
   * This is useful if you have a credit card assosiated to your cibus account, and you want to avoid remaining balance in Cibus.
   */
  private async getGiftCardElementClosestToBalance(page: Page, balance: number) {
    const giftCardElements = await page.$$(getTestIdSelector("horizontal-item-card-price"));
    const shouldPassBalance = this.config.shouldPassBalance !== undefined ? this.config.shouldPassBalance : false;
    let closestElement: { element: ElementHandle<Element>; absDiff: number; price: number } | null = null;

    for (const element of giftCardElements) {
      const text = await page.evaluate((el) => el.textContent, element);
      const price = parseFloat(text.replace("₪", ""));
      const diff = balance - price;

      // Skipping the element if the price is not valid based on the shouldPassBalance config
      if ((!shouldPassBalance && diff < 0) || (shouldPassBalance && diff > 0)) {
        continue;
      }

      const absDiff = Math.abs(diff);

      if (!closestElement || absDiff < closestElement.absDiff) {
        closestElement = { element, absDiff, price };
      }
    }

    if (!closestElement) {
      throw new Error("Could not find any gift card element with price closest to the balance.");
    }

    return { element: closestElement.element, price: closestElement.price };
  }

  /**
   * Get the current balance from the cibus website using the cibus scraper.
   */
  async getCibusBalance() {
    if (!this.config.cibusScraperOptions) {
      throw new Error("Cibus scraper options are required if the balance is not provided in the config.");
    }

    const cibusScraper = new CibusScraper();
    const { balance } = await cibusScraper.scrap(this.config.cibusScraperOptions);

    return balance;
  }
}
