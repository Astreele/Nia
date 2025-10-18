const { getUser, totalExpForLevel } = require('../../features/leveling');
const db = require('../../utils/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'profile',
  description: 'Displays your level and experience stats.',
  async execute(ctx) {
    const user = getUser(ctx.author.id);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyData = db.prepare('SELECT exp FROM monthly_exp WHERE user_id = ? AND month = ?').get(ctx.author.id, currentMonth);

    const expForNext = totalExpForLevel(user.level + 1);
    const progress = Math.floor(user.total_exp);
    const nextLevel = Math.floor(expForNext);
    
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${ctx.author.username}'s Profile`)
      .setThumbnail(ctx.author.displayAvatarURL())
      .addFields(
        { name: 'Level', value: `**${user.level}**`, inline: true },
        { name: 'Progress to Next Level', value: `\`${progress} / ${nextLevel} EXP\``, inline: false },
        { name: 'All-Time EXP Gained', value: `\`${Math.floor(user.total_exp)}\``, inline: false },
        { name: `This Month's EXP`, value: `\`${monthlyData ? monthlyData.exp : 0}\``, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `User ID: ${ctx.author.id}` });

    await ctx.reply({ embeds: [embed] });
  }
};
