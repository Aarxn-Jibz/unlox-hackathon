export class TelegramClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Sends a markdown-formatted message to the specified Telegram chat ID.
   */
  async sendMessage(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Sends text accompanied by interactive inline buttons.
   */
  async sendInlineKeyboard(
    chatId: string,
    text: string,
    buttons: { text: string; callback_data: string }[][],
  ) {
    return this.sendMessage(chatId, text, {
      inline_keyboard: buttons,
    });
  }

  /**
   * Acknowledges button clicks to Telegram.
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    const url = `https://api.telegram.org/bot${this.token}/answerCallbackQuery`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to answer callback query: ${response.statusText}`);
    }
    return response.json();
  }
}
