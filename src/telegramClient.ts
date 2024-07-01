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
          await this.bot.sendMessage(this.chatId, "Thank you. Proceeding with loading your cibus");
          this.didLoginAcked = true;
          resolve(await onLoginAck());
          this.stopBot();
        }
      });

      // Wait for timeout
      setTimeout(() => {
        reject(new Error("Login ack timeout"));
      }, timeoutMs);
    });
  }

  async sendEmailLoginMessageWithRetry(
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

      lastMessage = await this.sendEmailLoginMessage();
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      retries++;
    }
  }

  async sendEmailLoginMessage(): Promise<TelegramBot.Message> {
    logger.info({ chatId: this.chatId }, "Sending email login message");
    return this.bot.sendMessage(
      this.chatId,
      "Please login in to Wolt via this link: \n https://wolt.com/en/me/personal-info",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "I have logged in",
                callback_data: TelegramBotClient.loginButtonCallbackData,
              },
            ],
          ],
        },
      }
    );
  }

  stopBot(): void {
    this.bot.stopPolling();
  }
}
