const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const path = require('path');
const logger = require('./src/utils/logger');
const monthlyReset = require('./src/tasks/monthlyReset');

// Initialize the Database first to ensure tables are ready
require('./src/utils/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.config = require('./config.json');
client.commands = new Collection();
client.cooldowns = new Collection();
client.textCommands = new Map();

// Attach handlers
const commandHandler = require('./src/handlers/commandHandler')(client);
const eventHandler = require('./src/handlers/eventHandler')(client);

client.commandHandler = commandHandler;
client.eventHandler = eventHandler;

(async () => {
  try {
    // Load commands and events
    await commandHandler.loadCommands();
    await commandHandler.registerCommands();
    await eventHandler.loadEvents();

    // Start file watchers for hot-reloading (optional, good for development)
    if (client.config.devGuildId) {
      commandHandler.watchCommands();
      logger.info('Watching command files for changes...');
    }

    // Schedule monthly tasks
    monthlyReset(client);

    // Login to Discord
    await client.login(client.config.token);
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
