const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Slash command: /hello
app.command('/hello', async ({ command, ack, respond }) => {
  await ack();
  await respond(`Hey there, <@${command.user_id}>! :wave:`);
});

// Slash command: /help
app.command('/help', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Available Commands:*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '`/hello` - Get a friendly greeting\n`/help` - Show this help message\n`/echo [text]` - Echo back your message',
        },
      },
    ],
  });
});

// Slash command: /echo
app.command('/echo', async ({ command, ack, respond }) => {
  await ack();
  const text = command.text || 'You didn\'t provide any text!';
  await respond(`You said: ${text}`);
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`Slackbot is running on port ${port}`);
})();
