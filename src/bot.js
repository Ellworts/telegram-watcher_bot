const { Telegraf } = require("telegraf");
const admin = require("firebase-admin");
const axios = require("axios");
const { BOT_TOKEN, FIREBASE_CREDENTIALS_PATH, OPENAI_API_KEY } = require("./config");
const path = require("path");

const serviceAccount = require('./telebot-watcher-firebase-adminsdk-fbsvc-780d9431be.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const bot = new Telegraf(BOT_TOKEN);

const allowedUserId = 753599659;

async function getChatGptResponse(prompt) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 150,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Получаем ответ от ChatGPT
        const message = response.data.choices[0].message.content.trim();
        return message;
    } catch (error) {
        console.error("Ошибка при получении ответа от ChatGPT:", error);
        return null;
    }
}

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    if (userId === allowedUserId) {

  const prompt = `Translate my text from Russian to English, separating them into two parts with '///' as the delimiter. The Russian text should come first, followed by a line break and then the English translation. Follow this example: Example: Russian text\n\n /// \n\nEnglish text. Do it with that text: ${messageText}`;
        


        const processedMessage = await getChatGptResponse(prompt);

        if (processedMessage) {

            const channelId = '@mxrgtm';


            bot.telegram.sendMessage(channelId, processedMessage)
                .then((sentMessage) => {
                    console.log(`✅ Сообщение от пользователя ${userId} отправлено в канал`);


                    const cleanChannelId = channelId.replace('@', '');


                    const postData = {
                        post_id: sentMessage.message_id,
                        telegram_channel: cleanChannelId,
                        message_id: sentMessage.message_id,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    };

                    const script = `
                        <script async src="https://telegram.org/js/telegram-widget.js?7"
                                data-telegram-post="${cleanChannelId}/${sentMessage.message_id}"
                                data-width="100%"
                                data-dark="1"></script>
                    `;

                    postData.script = script;

                    const postRef = db.collection("telegramPosts").doc(sentMessage.message_id.toString());

                    postRef.set(postData)
                        .then(() => {
                            console.log(`✅ Пост ${sentMessage.message_id} сохранён с кодом для вставки в Firebase`);
                        })
                        .catch((err) => {
                            console.error("Ошибка при записи в Firebase:", err);
                        });
                })
                .catch((err) => {
                    console.error("Ошибка при отправке сообщения в канал:", err);
                });
        } else {
            console.log("Ошибка при обработке текста через ChatGPT");
        }
    } else {
        console.log(`🚫 Сообщение от пользователя с ID ${userId} игнорируется`);
    }
});

bot.on("channel_post", (ctx) => {
    const post = ctx.channelPost;
    const postId = post.message_id;
    const channelUsername = post.chat.username;


    const cleanChannelUsername = channelUsername.replace('@', '');

    const postData = {
        post_id: postId,
        telegram_channel: cleanChannelUsername,
        message_id: postId,
    };

    const script = `
        <script async src="https://telegram.org/js/telegram-widget.js?7"
                data-telegram-post="${cleanChannelUsername}/${postId}"
                data-width="100%"
                data-dark="1"></script>
    `;

    postData.script = script;

    const postRef = db.collection("telegramPosts").doc(postId.toString());

    postRef.set(postData)
        .then(() => {
            console.log(`✅ Пост ${postId} сохранён с кодом для вставки в Firebase`);
        })
        .catch((err) => {
            console.error("Ошибка при записи в Firebase:", err);
        });
});

bot.launch();
console.log("🤖 Бот запущен!");
