// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());

// Bot setup
const TOKEN = process.env.BOT_TOKEN || "6101546952:AAEz5jZUttyCtCxmBSz47_7Or2i-NvmhFmI";
const URL = process.env.RENDER_EXTERNAL_URL || "https://trackdown-ld0o.onrender.com"; // Render public URL
const WEBHOOK_URL = `${URL}/webhook/${TOKEN}`;

const bot = new TelegramBot(TOKEN, { polling: false });

// Set webhook
bot.setWebHook(WEBHOOK_URL);

// Webhook endpoint
app.post(`/webhook/${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Bot commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🚀 Hello! Your TrackDown bot is live using webhook mode!");
});

bot.on("message", (msg) => {
  if (msg.text && msg.text.toLowerCase() === "hi") {
    bot.sendMessage(msg.chat.id, "👋 Hello there!");
  }
});

// Express root route
app.get("/", (req, res) => {
  res.send("TrackDown Telegram Bot is running with webhook 🚀");
});

// Start server
app.listen(port, () => {
  console.log(`App Running on Port ${port}`);
});
