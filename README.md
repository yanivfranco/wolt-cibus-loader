# WoltCibusLoader

This project is here to help you and load your cibus extra credits to wolt.

After a few thousands shekels have been lost due to expiery of cibus credits, I decided to autotmate the process (which regardless, is cumbersome and painfull), and save my food money.

> **NOTE: Unfortunately, wolt login process is not fully automated, and requires user interaction (via telegram bot). This is due to the fact that wolt probably has a bot detection mechanism, which prevent emails to be sent from a non-human source. If you have any ideas on how to bypass and automate this process, please let me know.**

# Prerequisites

- [Node.js](https://nodejs.org) >= 18.x installed.
- Wolt & Cibus accounts
- Telegram

  - New bot API token (super easy [tutorial](https://core.telegram.org/bots/tutorial))
  - Your telegram user `chatId` (just message this [bot](https://web.telegram.org/k/#@chatIDrobot))

- Google cloud project with the following:

  - Enabled Gmail API
  - OAuth conset screen
  - `google-credentials.json` file with app credentials in your project `root` folder
  - token.json file with user access token & refresh token (generated on first run)

  To acheive all of the above, please follow this[ quickstart guide](https://developers.google.com/gmail/api/quickstart/nodejs) just up untill "**Install the client library**"

# Installation

npm

```sh
npm install wolt-cibus-loader --save
```

yarn

```sh
yarn add wolt-cibus-loader
```

# Usage

### First run

```ts
import { WoltCibusLoader } from "wolt-cibus-loader";

(async function () {
  try {
    const woltCibusLoader = new WoltCibusLoader({
      woltEmail: process.env.WOLT_EMAIL,
      cibusScraperOptions: {
        username: process.env.CIBUS_USERNAME,
        password: process.env.CIBUS_PASSWORD,
        company: process.env.CIBUS_COMPANY,
      },
      telegramBot: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        userChatId: Number(process.env.TELEGRAM_USER_CHAT_ID),
      },
      allowCreditCardCharge: false,
      dryRun: true,
      shouldReedemCode: true,
    });
    const orderConfirmationNumber = await woltCibusLoader.loadRemainingCibusBalanceToWolt();
    console.log(
      `Successfully loaded remaining Cibus balance to Wolt. Order confirmation number: ${orderConfirmationNumber}`
    );
  } catch (e: any) {
    console.error(`Error loading remaining Cibus balance to Wolt: ${e.message}`);
  }
})();
```

In order to authorize the app to access your gmail account, and save the credentials for future use, the first run should be done **manually**.

make sure `google-credentials.json` is present in your root directory.

You will first be notified by the telegram bot to initiate **email login in wolt**. After the email is sent, you should click the "ack" button in the telegram message. (**Do not open the email** or click the link that is sent to you, the whole point is to automate this process).

After aknowledging, you will be prompted to **login to your Gmail** account, and allow the app to access your email.
Once you have done that, the app will save the credentials and you will be able to run the app with minimal user interaction.

\*You will notice a `token.json` file created in your root directory, this file contains the user access token and refresh token, and will be used for future runs, and user interaction will not be needed.
You should keep this file safe and not share it with anyone.

> **IMPORTANT: Don't forget to add the `token.json` and `google-credentials.json` to your `.gitignore` file!**

#### Subsequent runs

Just remove the `dryRun` option, and you are good to go.

### Docker

Feel free to use the example `main.ts` & `Dockerfile` to create a docker image and use it as you please.

# API

## WoltCibusLoader

### Constructor

```ts
new WoltCibusLoader(config: WoltCibusLoaderConfig)
```

#### WoltCibusLoaderConfig

| Name                   | Type                                                                                                                                                | Default   | Description                                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| woltEmail              | string (required)                                                                                                                                   | -         | Wolt user email.                                                                                                                                                                                                                                     |
| cibusScraperOptions    | [CibusScraperOptions](https://github.com/yanivfranco/cibus-scraper/blob/cbde9fe6c0395894f382d62579b93a24338e84a4/src/cibusScraper.ts#L4) (optional) | undefined | Options for the cibus scraper in order to get current balance and login to the cibus website.                                                                                                                                                        |
| balanceToLoad          | number (optional)                                                                                                                                   | undefined | Cibus balance to load to Wolt. If not provided, the balance will be fetched from the cibus website.                                                                                                                                                  |
| allowCreditCardCharge  | boolean (optional)                                                                                                                                  | false     | Whether to find a gift card with price higher than the balance, charging the remaining balance with a credit card.<br />This is useful if you have a credit card assosiated to your cibus account, and you want to avoid remaining balance in Cibus. |
| maxCreditCardCharge    | number (optional)                                                                                                                                   | 50        | The max amount to charge with the credit card.<br />If no gift card is found in the given price range, the first lower price gift card will be used.                                                                                                 |
| shouldReedemCode       | boolean (optional)                                                                                                                                  | true      | Whether the code should be retrieved from the gift card mail and redeemed automatically.                                                                                                                                                             |
| getWoltLoginMagicLink  | function (optional)                                                                                                                                 | undefined | Function that returns the magic link from the login email received. This or `telegramBot` must be provided.                                                                                                                                          |
| telegramBot            | {<br /> token : string,<br /> userChatId : number<br />}                                                                                            | undefined | Telegram bot details. This or `getWoltLoginMagicLink` must be provided.                                                                                                                                                                              |
| puppeteerLaunchOptions | [PuppeteerLaunchOptions](https://pptr.dev/api/puppeteer.puppeteerlaunchoptions)                                                                     | undefined | Puppeteer launch options to be passed to the puppeteer.launch function.                                                                                                                                                                              |
| dryRun                 | boolean                                                                                                                                             | false     | If true, the flow will be executed without actually submitting the order, it will only log the submitted details.                                                                                                                                    |

### Methods

```ts
loadRemainingCibusBalanceToWolt(): Promise<string>
```

- Main method to load the remaining cibus balance to wolt.

# License

The MIT License
