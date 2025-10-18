const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');

  async function loadEvents() {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    // Clear existing listeners to prevent duplicates during reloads
    client.removeAllListeners();

    for (const file of eventFiles) {
      try {
        const filePath = path.join(eventsPath, file);
        delete require.cache[require.resolve(filePath)];
        const event = require(filePath);
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      } catch (err) {
        logger.error(`Error loading event ${file}:`, err);
      }
    }
    logger.info(`Loaded ${eventFiles.length} events.`);
  }

  return {
    loadEvents
  };
};
