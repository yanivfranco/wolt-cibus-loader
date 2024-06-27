# WoltCibusLoader

This project is here to help you and load your cibus extra credits to wolt.

After I lost few hundered shekels due to expiery of cibus credits, I decided to autotmate the process (which is cumbersome and painfull, regardless), and save my food money.

# Prerequisites

- [Node.js](https://nodejs.org) >= 18.x installed.
- Wolt & Cibus accounts
- Google cloud project with the following:

  - Enabled gmail API
  - OAuth conset screen
  - .json credentials file

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

##### First run

In order to authorize the app to access your gmail account, and save the credentials for future use, the first run should be done manually.

```node
import { WoltCibusLoader } from "wolt-cibus-loader";

(async function () {
  try {
    const loader = new WoltCibusLoader({
      googleCredentialsPath: "path/to/your/credentials.json",
      woltEmail: "your-wolt-email",
      woltPassword: "your-wolt-password",
      cibusEmail: "your-cibus-email",
      cibusPassword: "your-cibus-password",
    });

    await loader.init();
  } catch (e) {
    console.error(`initialization failed for the following reason: ${e.message}`);
  }
})();
```

# License

The MIT License
