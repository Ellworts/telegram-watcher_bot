const { Telegraf } = require("telegraf");
const admin = require("firebase-admin");
const axios = require("axios");
const { BOT_TOKEN, OPENAI_API_KEY } = require("./config");

const serviceAccount = {
  type: "service_account",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const bot = new Telegraf(BOT_TOKEN);
const allowedUserId = 753599659;
const channelId = "@mxrgtm";


async function getChatGptResponse(prompt) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Ошибка при получении ответа от ChatGPT:", error);
        return null;
    }
}

bot.command("post", async (ctx) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text.split(" ").slice(1).join(" ");

    if (ctx.chat.type === "channel") return;

    if (userId !== allowedUserId) {
        return ctx.reply("🚫 У вас нет прав на выполнение этой команды.");
    }

    if (!messageText) {
        return ctx.reply("⚠️ Пожалуйста, укажите текст после команды /post.");
    }

    const prompt = `Translate my text from Russian to English, separating them into two parts with '///' as the delimiter. Example:\n\nРусский текст\n\n///\n\nEnglish text.\n\nТекст: ${messageText}`;
    const processedMessage = await getChatGptResponse(prompt);

    if (processedMessage) {
        bot.telegram.sendMessage(channelId, processedMessage)
            .then((sentMessage) => {
                console.log(`✅ Сообщение отправлено в канал.`);

                const cleanChannelId = channelId.replace('@', '');
                const postData = {
                    post_id: sentMessage.message_id,
                    telegram_channel: cleanChannelId,
                    message_id: sentMessage.message_id,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    script: `
                        <script async src="https://telegram.org/js/telegram-widget.js?7"
                                data-telegram-post="${cleanChannelId}/${sentMessage.message_id}"
                                data-width="100%"
                                data-dark="1"></script>
                    `
                };

                db.collection("telegramPosts").doc(sentMessage.message_id.toString()).set(postData)
                    .then(() => console.log(`✅ Пост ${sentMessage.message_id} сохранён в Firebase`))
                    .catch(err => console.error("Ошибка при записи в Firebase:", err));
            })
            .catch(err => console.error("Ошибка при отправке сообщения в канал:", err));
    } else {
        ctx.reply("❌ Ошибка при обработке текста через ChatGPT.");
    }
});

/**
 */
bot.command("deletelast", async (ctx) => {
    const userId = ctx.from.id;

    if (ctx.chat.type === "channel") return;

    if (userId !== allowedUserId) {
        return ctx.reply("🚫 У вас нет прав на выполнение этой команды.");
    }

    try {
        const postsRef = db.collection("telegramPosts");
        const querySnapshot = await postsRef.orderBy("timestamp", "desc").limit(1).get();

        if (querySnapshot.empty) {
            return ctx.reply("⚠️ В базе данных нет записей.");
        }

        const lastDoc = querySnapshot.docs[0];
        const lastDocId = lastDoc.id;
        const lastMessageId = lastDoc.data().message_id;

        await postsRef.doc(lastDocId).delete();

        await bot.telegram.deleteMessage(channelId, lastMessageId);

        ctx.reply(`🗑 Удалена последняя запись с ID: ${lastMessageId} из канала и базы данных.`);
        console.log(`✅ Удалена запись: ${lastMessageId}`);
    } catch (error) {
        console.error("❌ Ошибка при удалении записи:", error);
        ctx.reply("❌ Произошла ошибка при удалении записи.");
    }
});


bot.launch();
console.log("🤖 Бот запущен!");
