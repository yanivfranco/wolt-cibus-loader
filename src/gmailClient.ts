import { authenticate } from "@google-cloud/local-auth";
import * as fs from "fs/promises";
import { gmail_v1, google } from "googleapis";
import moment from "moment";
import * as path from "path";
import PDFParser from "pdf2json";
import * as process from "process";
import { logger } from "./logger";

type OAuth2Client = Awaited<ReturnType<typeof authenticate>>;
type JSONClient = ReturnType<typeof google.auth.fromJSON>;

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "google-credentials.json");

export class GmailClient {
  private client: OAuth2Client | JSONClient;

  private gmail: gmail_v1.Gmail;

  private initialized = false;
  constructor() {}

  async init() {
    await this.authorize();

    this.gmail = google.gmail({ version: "v1", auth: this.client as OAuth2Client });
    this.initialized = true;
  }

  /**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
  async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH, "utf8");
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  /**
   * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async saveCredentials(client: OAuth2Client) {
    const content: any = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }

  /**
   * Load or request or authorization to call APIs.
   */
  async authorize(): Promise<void> {
    logger.info("Authorizing google user...");
    let client: OAuth2Client | JSONClient = await this.loadSavedCredentialsIfExist();
    if (client) {
      logger.info("Loaded google user credentials from file.");
      this.client = client;
      return;
    }

    logger.info(
      "No saved credentials found, this is probably a first run. requesting authorization... (make sure to run this on your local machine)"
    );
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });

    logger.info("Authorized google user.");

    if (client.credentials) {
      logger.info("Saving credentials to file...");
      await this.saveCredentials(client);
    }

    this.client = client;
  }

  /**
   * Get the Wolt login email from the Gmail API.
   *
   * @param {Moment} sentTime
   * @returns
   */
  async getWoltLoginMagicLink(sentTime: moment.Moment) {
    if (!this.initialized) {
      await this.init();
    }

    const res = await this.gmail.users.messages.list({
      userId: "me",
      // seconds since epoch
      q: `from:info@wolt.com after:${sentTime.unix()}`,
    });
    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      throw new Error("No messages found in gmail.");
    }

    if (messages.length > 1) {
      logger.warn("Multiple messages found in gmail. Returning the first one. This might cause issues.");
    }

    const message = messages[0];
    const messageRes = await this.gmail.users.messages.get({
      userId: "me",
      id: message.id!,
      format: "full",
    });

    const emailHtml = Buffer.from(messageRes.data.payload.parts[1].body.data, "base64").toString("utf-8");
    const magicLink = emailHtml.match(/https:\/\/wolt.com\/\S+/)?.[0];

    if (!magicLink) {
      throw new Error("Could not find the magic link in the email.");
    }

    return magicLink.replace(/"/g, "").replace(/&amp;/g, "&");
  }

  /**
   * Get the gift card code from email.
   * Finding the email with the gift card attachment, then, extracts the code from the pdf attachment.
   */
  async getCodeFromGiftCardEmail(orderSubmitTime: moment.Moment) {
    if (!this.initialized) {
      await this.init();
    }

    const res = await this.gmail.users.messages.list({
      userId: "me",
      q: `from:info@wolt.com wolt gift card has:attachment  filename:"Wolt gift card English" after:${orderSubmitTime.unix()} "`,
    });

    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      throw new Error("No messages found in gmail.");
    }

    if (messages.length > 1) {
      logger.warn("Multiple messages found in gmail. Returning the first one. This might cause issues.");
    }

    const message = messages[0];
    const messageRes = await this.gmail.users.messages.get({
      userId: "me",
      id: message.id!,
      format: "full",
    });

    // Get the attachment
    const attachmentId = messageRes.data.payload.parts[2].body.attachmentId;
    const attachment = await this.gmail.users.messages.attachments.get({
      userId: "me",
      messageId: message.id!,
      id: attachmentId!,
    });

    // parse pdf data
    const attachmentData = attachment.data.data;
    const attachmentBuffer = Buffer.from(attachmentData!, "base64");
    const pdfParser = new PDFParser();
    pdfParser.parseBuffer(attachmentBuffer);

    return new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) => {
        reject(errData);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const text = pdfData.Pages[0].Texts.map((t) => t.R.map((r) => r.T).join(""))
          .join("")
          .replaceAll("%20", "")
          .replaceAll("%3A", "");
        const code = text.match(/00CODE[\da-zA-Z]{8}/)?.[0].replace("00CODE", "");

        if (!code) {
          reject(new Error("Could not find a code in the email attachment."));
          return;
        }
        resolve(code);
      });
    });
  }
}