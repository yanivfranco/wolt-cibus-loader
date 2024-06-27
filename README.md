# WoltCibusLoader

This project is here to help you and load your cibus extra credits to wolt.

After I lost few thousands shekels due to expiery of cibus credits, I decided to autotmate the process (which is cumbersome and painfull, regardless), and save my food money.

# Prerequisites

- [Node.js](https://nodejs.org) >= 18.x installed.
- Wolt & Cibus accounts
- Google cloud project with the following:

  - Enabled gmail API
  - OAuth conset screen
  - google-credentials.json file with app credentials
  - token.json file with user access token & refresh token (generated on first run)

  To get the above, please follow this[ quickstart guide](https://developers.google.com/gmail/api/quickstart/nodejs) just up untill "**Install the client library**"

# Installation

For npm users

```sh
npm install wolt-cibus-loader --save
```

For yarn users

```sh
yarn add wolt-cibus-loader
```

# Usage

### First run

In order to authorize the app to access your gmail account, and save the credentials for future use, the first run should be done manually.

make sure `google-credentials.json` is present in your root directory.

```ts
import { WoltCibusLoader } from "wolt-cibus-loader";

(async function () {
  try {
    const loader = new WoltCibusLoader({
      woltEmail: "your-email",
      cibusScraperOptions: {
        username: "your-cibus-username",
        password: "your-cibus-password",
        company: "your-cibus-company",
      },
      puppeteerLaunchOptions: {
        headless: false, // So you can see the browser
      },
      testRun: true, // will only log the order and will not submit
    });

    const orderConfirmationNumber = await loader.loadRemainingCibusBalanceToWolt();
    console.log(
      `Successfully loaded remaining Cibus balance to Wolt. Order confirmation number: ${orderConfirmationNumber}`
    );
  } catch (e: any) {
    console.error(`Error loading remaining Cibus balance to Wolt: ${e.message}`);
  }
})();
```

You will notice a `token.json` file created in your root directory, this file contains the user access token and refresh token, and will be used for future runs, and user interaction will not be needed.
You should keep this file safe and not share it with anyone.

> **IMPORTANT: Don't forget to add the `token.json` and `google-credentials.json` to your `.gitignore` file!**

### Subsequent runs

Just remove the `testRun` option, and you are good to go.

# API

## WoltCibusLoader

### Constructor

```ts
new WoltCibusLoader(config: WoltCibusLoaderConfig)
```

#### WoltCibusLoaderConfig

| Name                   | Type                                                                                                                                                | Default   | Description                                                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| woltEmail              | string (required)                                                                                                                                   | -         | Wolt user email                                                                                                                                                                                                                                                                               |
| cibusScraperOptions    | [CibusScraperOptions](https://github.com/yanivfranco/cibus-scraper/blob/cbde9fe6c0395894f382d62579b93a24338e84a4/src/cibusScraper.ts#L4) (optional) | undefined | Options for the cibus scraper in order to get current balance and login to the cibus website                                                                                                                                                                                                  |
| balanceToLoad          | number (optional)                                                                                                                                   | undefined | Cibus balance to load to Wolt. If not provided, the balance will be fetched from the cibus website                                                                                                                                                                                            |
| shouldPassBalance      | boolean (optional)                                                                                                                                  | false     | Whether the closest gift card price should be higher than the cibus balance.<br />This is useful if you have a credit card assosiated to your cibus account, and you want to avoid remaining balance in Cibus.<br />(It is recommended to restrict the amount of credit card orders in cibus) |
| shouldReedemCode       | boolean (optional)                                                                                                                                  | true      | Whether the code should be retrieved from the gift card mail and redeemed automatically                                                                                                                                                                                                       |
| getWoltLoginMagicLink  | function (optional)                                                                                                                                 | undefined | Function that returns the magic link from the login email received                                                                                                                                                                                                                            |
| puppeteerLaunchOptions | [PuppeteerLaunchOptions](https://pptr.dev/api/puppeteer.puppeteerlaunchoptions)                                                                     | undefined | Puppeteer launch options to be passed to the puppeteer.launch function                                                                                                                                                                                                                        |
| testRun                | boolean                                                                                                                                             | false     | If true, the flow will be executed without actually submitting the order, it will only log the submitted details                                                                                                                                                                              |

### Methods

```ts
loadRemainingCibusBalanceToWolt(): Promise<string>
```

- Main method to load the remaining cibus balance to wolt.

# License

The MIT License
