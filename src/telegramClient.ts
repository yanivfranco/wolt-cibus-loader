import moment from "moment";
import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";

export class TelegramBotClient {
  private static loginButtonCallbackData = "login";

  private bot: TelegramBot;

  private didLoginAcked: boolean = false;

  constructor(
    token: string,
    private chatId: number
  ) {
    this.bot = new TelegramBot(token, { polling: true });
  }

  sendMessage(text: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    return this.bot.sendMessage(this.chatId, `🍟<b>${moment().format("DD/MM/YYYY HH:mm:ss")}</b>🍟: ${text}`, {
      ...options,
      parse_mode: "HTML",
    });
  }

  /**
   * Wait for the login acknoledgement button press.
   * Runs the given function when the button is pressed and resolves the promise with the result.
   */
  onLoginAck<T>(
    onLoginAck: () => Promise<T>,
    timeoutMs: number = moment.duration(5, "minutes").asMilliseconds()
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.bot.on("callback_query", async (query) => {
        if (query.message?.chat.id === this.chatId && query.data === TelegramBotClient.loginButtonCallbackData) {
          logger.info("Login ack received, stopping bot");

          // Handle the login ack
          await this.bot.answerCallbackQuery(query.id, { text: "Thank you. Proceeding with loading your cibus" });
          await this.bot.deleteMessage(this.chatId, query.message.message_id);
          await this.sendMessage("Thank you. Proceeding with loading your cibus credits to wolt... 🍔🍟🥤");
          this.didLoginAcked = true;
          resolve(await onLoginAck());
        }
      });

      // Wait for timeout
      setTimeout(() => {
        reject(new Error("Login ack timeout"));
      }, timeoutMs);
    });
  }

  async sendLoginRequestToUserWithRetries(
    timeout: number = moment.duration(60, "minutes").asMilliseconds(),
    retryInterval: number = moment.duration(5, "minutes").asMilliseconds()
  ): Promise<void> {
    let retries = 0;
    let lastMessage: TelegramBot.Message;
    while (!this.didLoginAcked) {
      if (retries * retryInterval > timeout) {
        throw new Error("Email login message timeout");
      }

      if (lastMessage) {
        await this.bot.deleteMessage(this.chatId, lastMessage.message_id);
      }

      lastMessage = await this.sendLoginRequestToUser();
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      retries++;
    }
  }

  /**
   * Send a login request to the user, with a button to acknoledge once email is sent.
   */
  async sendLoginRequestToUser(): Promise<TelegramBot.Message> {
    logger.info({ chatId: this.chatId }, "Sending email login message");
    return this.sendMessage(
      "Please start an email login flow in Wolt via this link: \n https://wolt.com/en/me/personal-info \nPress the button below once the email is sent. 👇",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Login email sent 📧👍",
                callback_data: TelegramBotClient.loginButtonCallbackData,
              },
            ],
          ],
        },
      }
    );
  }

  stop(): void {
    this.bot.stopPolling();
  }
}
