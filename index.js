import express from "express";
import TelegramBot from "node-telegram-bot-api";

const app = express();
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const HOST_URL = process.env.HOST_URL || `http://localhost:${PORT}`;

if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN not set in environment!");
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ✅ Middleware to normalize multiple slashes
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

// ✅ URL-safe Base64 helpers
function encodeSafe(str) {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeSafe(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf-8");
}

// ✅ Store user links in memory (for now)
let linkMap = {};

// ✅ Generate short link
function createLink(cid, msg) {
  const safeB64 = encodeSafe(msg);
  const shortPath = `${cid.toString(36)}/${safeB64}`;
  return `${HOST_URL}/c/${shortPath}`;
}

// ✅ Handle incoming Telegram messages
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text) return;

  const link = createLink(chatId, msg.text);
  linkMap[chatId] = msg.text;

  bot.sendMessage(chatId, `🔗 Your short link:\n${link}`);
});

// ✅ Redirect route
app.get("/c/:path/:uri", (req, res) => {
  try {
    const decoded = decodeSafe(req.params.uri);
    res.redirect(decoded);
  } catch (err) {
    res.status(400).send("❌ Invalid encoded URL");
  }
});

// Root check
app.get("/", (req, res) => {
  res.send("✅ Bot server running!");
});

app.listen(PORT, () => {
  console.log(`🚀 App Running on Port ${PORT}`);
});
