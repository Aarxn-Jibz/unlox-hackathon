import type { Context } from 'hono';
import { TelegramRepository } from '../models/telegram';
import { getTasksByUserId, getAttendanceByUserId } from '../models/academic';
import { TelegramClient } from '../lib/telegram';

/**
 * Interface representing incoming Telegram Bot API Update payload
 */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
      username?: string;
    };
    text?: string;
    reply_to_message?: {
      message_id: number;
      text?: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
      text?: string;
    };
    data: string;
  };
}

export async function handleTelegramWebhook(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const repo = new TelegramRepository(db);

    const update: TelegramUpdate = await c.req.json();
    console.log('Incoming Telegram Update:', JSON.stringify(update));

    let chatId: string | undefined;
    let text: string | undefined;
    let messageId: string | undefined;
    let replyToMessageId: string | undefined;
    let callbackQueryId: string | undefined;
    let callbackData: string | undefined;
    let isCallback = false;

    if (update.message) {
      chatId = update.message.chat.id.toString();
      text = update.message.text;
      messageId = update.message.message_id.toString();
      replyToMessageId = update.message.reply_to_message?.message_id.toString();
    } else if (update.callback_query && update.callback_query.message) {
      chatId = update.callback_query.message.chat.id.toString();
      messageId = update.callback_query.message.message_id.toString();
      callbackQueryId = update.callback_query.id;
      callbackData = update.callback_query.data;
      isCallback = true;
    }

    if (!chatId) {
      return c.json({ success: true, message: 'No chat ID found in payload' });
    }

    // Initialize client with token
    const token = c.env?.TELEGRAM_BOT_TOKEN || 'MOCK_TOKEN';
    const client = new TelegramClient(token);

    // Helper to send a reply back to Telegram and save to DB
    const sendTelegramReply = async (
      responseText: string,
      replyMarkup?: Record<string, unknown>,
    ) => {
      if (token && token !== 'MOCK_TOKEN') {
        try {
          await client.sendMessage(chatId!, responseText, replyMarkup);
        } catch (err) {
          console.error('Error sending Telegram HTTP request:', err);
        }
      }
      // Log bot reply in our repository
      await repo.saveMessage(chatId!, 'bot', responseText, null, messageId || null);
    };

    // Log incoming messages / button actions
    if (!isCallback && text) {
      let command: string | null = null;
      if (text.startsWith('/')) {
        command = text.split(' ')[0];
      }
      await repo.saveMessage(chatId, 'user', text, command, replyToMessageId || null);
    } else if (isCallback && callbackData) {
      await repo.saveMessage(chatId, 'user', `Clicked button: ${callbackData}`, null, null);
    }

    // Retrieve active state for context mapping
    const chatState = await repo.getChatState(chatId);
    const activeState = chatState?.activeState || null;
    const userId = chatState?.userId || null;

    // 1. Handle Callback Query
    if (isCallback && callbackData) {
      // Acknowledge callback query
      if (token && token !== 'MOCK_TOKEN' && callbackQueryId) {
        try {
          await client.answerCallbackQuery(callbackQueryId);
        } catch (err) {
          console.error('Error answering callback query:', err);
        }
      }

      if (callbackData === 'view_tasks') {
        await handleTasksCommand(db, repo, chatId, userId, sendTelegramReply);
      } else if (callbackData === 'bunk_calculator') {
        await handleBunkCommand(db, repo, chatId, userId, sendTelegramReply, client);
      } else if (callbackData === 'link_account') {
        await repo.setChatState(chatId, 'AWAITING_EMAIL');
        await sendTelegramReply(
          'Please reply with your CampusFlow account email to link your account:',
        );
      } else if (callbackData.startsWith('calc_bunk:')) {
        const subject = callbackData.substring('calc_bunk:'.length);
        await handleBunkCalculationDirect(db, repo, chatId, userId, subject, sendTelegramReply);
      }
      return c.json({ success: true });
    }

    // 2. Handle Commands
    if (text?.startsWith('/')) {
      const parts = text.split(' ');
      const cmd = parts[0].toLowerCase();

      if (cmd === '/start') {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '🔗 Link Account', callback_data: 'link_account' },
              { text: '📋 View Tasks', callback_data: 'view_tasks' },
            ],
            [{ text: '📊 Bunk Calculator', callback_data: 'bunk_calculator' }],
          ],
        };
        await sendTelegramReply(
          'Welcome to CampusFlow Bot! 🚀\nYour student companion. Here are my capabilities:\n- Link your account to sync tasks & attendance\n- Check pending tasks (/tasks)\n- Calculate attendance bunk margins (/bunk)',
          keyboard,
        );
      } else if (cmd === '/link') {
        const email = parts[1];
        if (!email) {
          await repo.setChatState(chatId, 'AWAITING_EMAIL');
          await sendTelegramReply(
            'Please specify an email: `/link student@example.com` or just type your email address.',
          );
        } else {
          await handleLinkEmail(repo, chatId, email, sendTelegramReply);
        }
      } else if (cmd === '/tasks') {
        await handleTasksCommand(db, repo, chatId, userId, sendTelegramReply);
      } else if (cmd === '/bunk') {
        await handleBunkCommand(db, repo, chatId, userId, sendTelegramReply, client);
      } else {
        await sendTelegramReply(
          "Sorry, I didn't recognize that command. Type `/start` to see options.",
        );
      }
      return c.json({ success: true });
    }

    // 3. Handle Direct Reply Prompts
    if (update.message?.reply_to_message && text) {
      const promptText = update.message.reply_to_message.text || '';
      if (promptText.toLowerCase().includes('email')) {
        await handleLinkEmail(repo, chatId, text.trim(), sendTelegramReply);
        return c.json({ success: true });
      }
    }

    // 4. Handle State-aware Conversations
    if (activeState && text) {
      if (activeState === 'AWAITING_EMAIL') {
        await handleLinkEmail(repo, chatId, text.trim(), sendTelegramReply);
      }
      return c.json({ success: true });
    }

    // No active state, reply with general info
    await sendTelegramReply('Hello! Feel free to send `/start` or `/tasks` to interact with me.');
    return c.json({ success: true });
  } catch (error) {
    console.error('Error handling Telegram Webhook:', error);
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
}

/**
 * Handle linking user by email
 */
async function handleLinkEmail(
  repo: TelegramRepository,
  chatId: string,
  email: string,
  sendReply: (text: string) => Promise<void>,
) {
  const success = await repo.linkChatToUser(email, chatId);
  if (success) {
    await repo.setChatState(chatId, null);
    await sendReply('🎉 Account successfully linked! You can now check your tasks with `/tasks`.');
  } else {
    await sendReply(
      '❌ Could not find a CampusFlow account with that email. Please check the spelling and try again:',
    );
  }
}

/**
 * Handle listing tasks for linked user
 */
async function handleTasksCommand(
  db: D1Database,
  repo: TelegramRepository,
  chatId: string,
  userId: string | null,
  sendReply: (text: string) => Promise<void>,
) {
  if (!userId) {
    await repo.setChatState(chatId, 'AWAITING_EMAIL');
    await sendReply(
      '🔑 Your Telegram chat is not linked to a CampusFlow account. Please enter your email address to link them:',
    );
    return;
  }

  const tasks = await getTasksByUserId(db, userId);
  if (tasks.length === 0) {
    await sendReply('You have no tasks on your list. Enjoy your free time! 🌴');
    return;
  }

  let list = '📋 *Your CampusFlow Tasks:*\n\n';
  tasks.forEach((t) => {
    const statusIcon = t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '⏳' : '📌';
    const dueStr = t.dueDate ? ` (Due: ${t.dueDate})` : '';
    list += `${statusIcon} *${t.title}*${dueStr} - [${t.priority.toUpperCase()}]\n`;
  });

  await sendReply(list);
}

/**
 * Present inline buttons with tracked subjects to calculate skip margins
 */
async function handleBunkCommand(
  db: D1Database,
  repo: TelegramRepository,
  chatId: string,
  userId: string | null,
  sendReply: (text: string) => Promise<void>,
  client: TelegramClient,
) {
  if (!userId) {
    await repo.setChatState(chatId, 'AWAITING_EMAIL');
    await sendReply('🔑 Please link your account first by entering your email:');
    return;
  }

  const attendanceList = await getAttendanceByUserId(db, userId);
  if (attendanceList.length === 0) {
    await sendReply(
      '❌ You do not have any tracked subjects yet. Please add subjects and log attendance on the web platform first.',
    );
    return;
  }

  // Format buttons
  const buttons = attendanceList.map((a) => [
    {
      text: `${a.subjectName} (${a.percentage.toFixed(1)}%)`,
      callback_data: `calc_bunk:${a.subjectName}`,
    },
  ]);

  const responseText =
    '📊 *Bunk Calculator*\nSelect a subject below to calculate your attendance skip margin:';
  if (client && client['token'] !== 'MOCK_TOKEN') {
    try {
      await client.sendInlineKeyboard(chatId, responseText, buttons);
    } catch (err) {
      console.error('Error sending inline keyboard to Telegram:', err);
    }
  }

  // Log bot reply
  await repo.saveMessage(chatId, 'bot', responseText, null, null);
}

/**
 * Handle direct calculation for chosen subject callback
 */
async function handleBunkCalculationDirect(
  db: D1Database,
  _repo: TelegramRepository,
  _chatId: string,
  userId: string | null,
  subject: string,
  sendReply: (text: string) => Promise<void>,
) {
  if (!userId) {
    await sendReply('🔑 Please link your account first.');
    return;
  }

  const list = await getAttendanceByUserId(db, userId);
  const matched = list.find((a) => a.subjectName.toLowerCase() === subject.toLowerCase());

  if (matched) {
    const pct = matched.percentage.toFixed(1);
    let calculationText = `📊 *Bunk Calculator - ${matched.subjectName}*\n\n`;
    calculationText += `Current Attendance: *${matched.attended}/${matched.total}* (${pct}%)\n`;
    calculationText += `Target Percentage: *${matched.targetPercentage}%*\n\n`;

    if (matched.percentage >= matched.targetPercentage) {
      calculationText += `🎉 You are above your target! You can safely *bunk ${matched.bunksPossible}* more class(es).`;
    } else {
      calculationText += `🚨 You are below target! You need to *attend ${matched.classesToAttend}* consecutive class(es) to reach the target.`;
    }

    await sendReply(calculationText);
  } else {
    await sendReply(`Could not find attendance stats for subject: *${subject}*.`);
  }
}
