import { Hono } from 'hono';
import { handleTelegramWebhook } from '../controllers/telegram';

const telegramRoutes = new Hono();

telegramRoutes.post('/webhook', handleTelegramWebhook);

export default telegramRoutes;
