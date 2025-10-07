const { AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'kind',
  description: 'Describe Kind Wewo ♡',
  async execute(interaction) {
   // const filePath = path.join(__dirname, 'image.png'); // Ensure the image is in the same directory as this file
    const attachment = new AttachmentBuilder('src/commands/fun/kind.jpg');

    await interaction.reply({
      files: [attachment]
    });
  },
};
