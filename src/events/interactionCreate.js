const { Collection, PermissionsBitField } = require('discord.js');
const { createCtxForInteraction } = require('../utils/respond');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const ownerId = client.config.ownerId || client.config.ownerID;
    if (command.ownerOnly && interaction.user.id !== ownerId) {
      return interaction.reply({ content: 'You cannot use this command.', ephemeral: true });
    }

    if (command.guildOnly && !interaction.inGuild()) {
      return interaction.reply({ content: 'This command can only be used in servers.', ephemeral: true });
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name) || new Collection();
    const cooldownAmount = (command.cooldown || 3) * 1000;
    if (timestamps.has(interaction.user.id)) {
      const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expiration) {
        const timeLeft = ((expiration - now) / 1000).toFixed(1);
        return interaction.reply({ content: `Please wait ${timeLeft}s before using \`${command.name}\`.`, ephemeral: true });
      }
    }
    timestamps.set(interaction.user.id, now);
    client.cooldowns.set(command.name, timestamps);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    let args = [];
    if (Array.isArray(command.options) && command.options.length) {
      args = command.options.map(opt => interaction.options.get(opt.name)?.value ?? null);
    }

    const ctx = createCtxForInteraction(interaction);

    try {
      await command.execute(ctx, client, args);
    } catch (err) {
      logger.error(`Error executing slash command ${command.name}:`, err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  }
};
