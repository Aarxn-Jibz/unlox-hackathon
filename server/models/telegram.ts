export interface DBTelegramChat {
  chat_id: string;
  user_id: string | null;
  active_state: string | null;
  created_at: string;
}

export interface DBTelegramMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'bot';
  message_text: string;
  command: string | null;
  reply_to_message_id: string | null;
  created_at: string;
}

export class TelegramRepository {
  db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Saves a message to the database. First ensures the chat exists.
   */
  async saveMessage(
    chatId: string,
    sender: 'user' | 'bot',
    text: string,
    command?: string | null,
    replyToMessageId?: string | null,
  ): Promise<DBTelegramMessage> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Ensure the chat exists in telegram_chats first
    await this.db
      .prepare('INSERT OR IGNORE INTO telegram_chats (chat_id, created_at) VALUES (?, ?)')
      .bind(chatId, now)
      .run();

    // Save the message
    await this.db
      .prepare(
        `INSERT INTO telegram_messages (id, chat_id, sender, message_text, command, reply_to_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, chatId, sender, text, command || null, replyToMessageId || null, now)
      .run();

    return {
      id,
      chat_id: chatId,
      sender,
      message_text: text,
      command: command || null,
      reply_to_message_id: replyToMessageId || null,
      created_at: now,
    };
  }

  /**
   * Returns recent messages for a given chat, ordered by creation time descending.
   */
  async getChatHistory(chatId: string, limit = 50): Promise<DBTelegramMessage[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM telegram_messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(chatId, limit)
      .all<DBTelegramMessage>();

    return results || [];
  }

  /**
   * Retrieves the active_state and associated user_id for a given chat.
   */
  async getChatState(
    chatId: string,
  ): Promise<{ activeState: string | null; userId: string | null } | null> {
    const result = await this.db
      .prepare('SELECT active_state, user_id FROM telegram_chats WHERE chat_id = ?')
      .bind(chatId)
      .first<{ active_state: string | null; user_id: string | null }>();

    if (!result) {
      return null;
    }

    return {
      activeState: result.active_state,
      userId: result.user_id,
    };
  }

  /**
   * Updates the active_state for context tracking.
   */
  async setChatState(chatId: string, state: string | null): Promise<void> {
    const now = new Date().toISOString();

    // Ensure the chat exists in telegram_chats first
    await this.db
      .prepare('INSERT OR IGNORE INTO telegram_chats (chat_id, created_at) VALUES (?, ?)')
      .bind(chatId, now)
      .run();

    await this.db
      .prepare('UPDATE telegram_chats SET active_state = ? WHERE chat_id = ?')
      .bind(state, chatId)
      .run();
  }

  /**
   * Associates the chat_id with a student user_id based on their email.
   */
  async linkChatToUser(email: string, chatId: string): Promise<boolean> {
    const now = new Date().toISOString();

    // Find the user by email
    const user = await this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string }>();

    if (!user) {
      return false;
    }

    // Ensure the chat exists in telegram_chats first
    await this.db
      .prepare('INSERT OR IGNORE INTO telegram_chats (chat_id, created_at) VALUES (?, ?)')
      .bind(chatId, now)
      .run();

    // Update user_id for the chat
    await this.db
      .prepare('UPDATE telegram_chats SET user_id = ? WHERE chat_id = ?')
      .bind(user.id, chatId)
      .run();

    return true;
  }
}
