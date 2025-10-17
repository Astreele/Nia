const { AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'evil2',
  description: 'Describe Evil Wewo ♡',
  async execute(interaction) {
   // const filePath = path.join(__dirname, 'image.png'); // Ensure the image is in the same directory as this file
    const attachment = new AttachmentBuilder('src/commands/fun/evil2.jpg');

    await interaction.reply({
      files: [attachment]
    });
  },
};
