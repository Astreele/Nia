const { Collection, PermissionsBitField } = require('discord.js');
const { createCtxForMessage } = require('../utils/respond');
const { addExp } = require('../features/leveling');
const db = require('../utils/database');
const logger = require('../utils/logger');

function parseArgs(text) {
  const re = /"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s]+)/g;
  const args = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }
  return args;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // --- Leveling Logic ---
    if (message.inGuild() && client.config.levelConfig) {
      const { requiredRoleId, expMultiplier = 0.5 } = client.config.levelConfig;
      if (requiredRoleId && message.member.roles.cache.has(requiredRoleId)) {
        const charCount = message.content.replace(/\s/g, '').length;
        if (charCount > 0) {
            const expGained = Math.round(charCount * expMultiplier);
            if(expGained > 0) {
                await addExp(message, expGained);
                db.prepare('INSERT INTO messages (user_id, message_content, char_count) VALUES (?, ?, ?)')
                  .run(message.author.id, message.content, charCount);
            }
        }
      }
    }
    
    // --- Command Handling ---
    const prefix = client.config.prefix || 'N.';
    if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

    const after = message.content.slice(prefix.length).trim();
    if (!after) return;

    const tokens = parseArgs(after);
    const commandName = tokens.shift().toLowerCase();
    const command = client.textCommands.get(commandName);
    if (!command) return;
    
    const ownerId = client.config.ownerId || client.config.ownerID;
    if (command.ownerOnly && message.author.id !== ownerId) {
      return message.reply({ content: 'You cannot use this command.' }).catch(()=>{});
    }

    // Permissions, Cooldowns, etc.
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name) || new Collection();
    const cooldownAmount = (command.cooldown || 3) * 1000;
    if (timestamps.has(message.author.id)) {
      const expiration = timestamps.get(message.author.id) + cooldownAmount;
      if (now < expiration) {
        const timeLeft = ((expiration - now) / 1000).toFixed(1);
        return message.reply({ content: `Please wait ${timeLeft}s before using \`${command.name}\`.` }).catch(()=>{});
      }
    }
    timestamps.set(message.author.id, now);
    client.cooldowns.set(command.name, timestamps);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      const ctx = createCtxForMessage(message);
      await command.execute(ctx, client, tokens);
    } catch (err) {
      logger.error(`Error executing text command ${command.name}:`, err);
      message.reply('There was an error trying to execute that command!').catch(()=>{});
    }
  }
};
