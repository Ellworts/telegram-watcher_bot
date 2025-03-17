# Telegram Bot with Translation

This Telegram bot allows you to post messages to your Telegram channel with automatic translation from Russian to English.

## Requirements

To use the bot, you'll need to set up a `.env` file with the following variables:

- **BOT_TOKEN**: Your bot's token (get it from [@BotFather](https://t.me/BotFather)).
- **CHANNEL_ID**: The ID of the Telegram channel you want to post messages to.
- **FIREBASE_CREDENTIALS_PATH**: Path to the credentials file for Firebase Firestore to store posts in the database.
- **OPENAI_API_KEY**: API key for OpenAI, required for translating posts from Russian to English. (Feel free to change the prompt if you wish)

## Setup

1. Create a `.env` file in the root directory of the project and include the following variables:

```bash
BOT_TOKEN=your_bot_token
CHANNEL_ID=your_channel_id
FIREBASE_CREDENTIALS_PATH=path_to_firebase_credentials
OPENAI_API_KEY=your_openai_api_key
```

2. Install dependencies by running the following command in your terminal: 
```bash
npm install
```

3. To start the bot, run the following command in your terminal (VS Code):
```bash
npm start
```
