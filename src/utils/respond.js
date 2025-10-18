function createCtxForMessage(message) {
  let deferredMessage = null;
  return {
    isCommand: () => false,
    author: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    content: message.content,
    createdTimestamp: message.createdTimestamp,
    async deferReply() {
      try {
        deferredMessage = await message.channel.send('⏳ Processing...');
      } catch (e) {
        try { await message.channel.sendTyping(); } catch {}
      }
    },
    async reply(options) {
      if (typeof options === 'string') return message.reply({ content: options });
      return message.reply(options);
    },
    async editReply(content) {
      const payload = typeof content === 'string' ? { content } : content;
      if (deferredMessage) {
        return deferredMessage.edit(payload);
      }
      return message.channel.send(payload);
    },
    async followUp(options) {
      const payload = typeof options === 'string' ? { content: options } : options;
      return message.channel.send(payload);
    }
  };
}

function createCtxForInteraction(interaction) {
  return {
    isCommand: () => true,
    author: interaction.user,
    member: interaction.member,
    guild: interaction.guild,
    channel: interaction.channel,
    content: null,
    createdTimestamp: interaction.createdTimestamp,
    async deferReply(opts) { return interaction.deferReply(opts); },
    async reply(options) { return interaction.reply(options); },
    async editReply(content) { return interaction.editReply(content); },
    async followUp(options) { return interaction.followUp(options); }
  };
}

module.exports = {
  createCtxForMessage,
  createCtxForInteraction
};
