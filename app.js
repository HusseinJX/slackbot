const { App, LogLevel } = require('@slack/bolt');
const {
  triggerShipSaferScan,
  getShipSaferStatus,
  formatScanResponse,
  formatStatusResponse,
} = require('./shipsaferClient');

// Check for required environment variables
if (!process.env.SLACK_BOT_TOKEN) {
  console.error('Missing SLACK_BOT_TOKEN environment variable');
  process.exit(1);
}
if (!process.env.SLACK_SIGNING_SECRET) {
  console.error('Missing SLACK_SIGNING_SECRET environment variable');
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
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
          text: '`/hello` - Get a friendly greeting\n`/help` - Show this help message\n`/echo [text]` - Echo back your message\n`/shipsafer scan <domain> [types]` - Run ShipSafer security scan\n`/shipsafer status <domain>` - Check scan status',
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

// Slash command: /shipsafer
app.command('/shipsafer', async ({ command, ack, respond }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  if (!subcommand || !['scan', 'status'].includes(subcommand)) {
    await respond(
      '*Usage:*\n' +
      '• `/shipsafer scan <domain> [scanTypes]` — Run a security scan\n' +
      '• `/shipsafer status <domain>` — Check scan status\n\n' +
      '_Scan types:_ `headers`, `ssl`, `xss`, `sqli`, etc. (comma-separated)'
    );
    return;
  }

  const domain = args[1];

  if (!domain) {
    await respond('Please provide a domain. Example: `/shipsafer scan example.com`');
    return;
  }

  try {
    if (subcommand === 'scan') {
      const scanTypesArg = args[2];
      const scanTypes = scanTypesArg
        ? scanTypesArg.split(',').map(s => s.trim()).filter(Boolean)
        : ['headers'];

      await respond(`Starting ShipSafer scan for \`${domain}\`...`);

      const resp = await triggerShipSaferScan({ domain, scanTypes });
      const message = formatScanResponse(domain, resp);
      await respond(message);

    } else if (subcommand === 'status') {
      const resp = await getShipSaferStatus(domain);
      const message = formatStatusResponse(resp);
      await respond(message);
    }
  } catch (error) {
    console.error('ShipSafer command error:', error);
    await respond(`Error: ${error.message}`);
  }
});

// Error handler
app.error(async (error) => {
  console.error('App error:', error);
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`Slackbot is running on port ${port}`);
  console.log('Waiting for Slack events...');
})();
