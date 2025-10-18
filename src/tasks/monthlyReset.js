const cron = require('node-cron');
const db = require('../utils/database');
const logger = require('../utils/logger');
const { totalExpForLevel } = require('../features/leveling');

async function demoteUser(client, userId, oldTier, newTier) {
  const { levelConfig } = require('../../config.json');
  try {
    const guild = await client.guilds.fetch(levelConfig.guildId);
    if (!guild) {
      logger.warn(`Cannot demote user: Guild ${levelConfig.guildId} not found.`);
      return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      logger.warn(`Cannot demote user ${userId}: Member not found in guild.`);
      return;
    }

    const oldRoleId = levelConfig.roles[oldTier];
    if (oldRoleId && member.roles.cache.has(oldRoleId)) {
      await member.roles.remove(oldRoleId);
    }

    if (newTier >= 10) {
      const newRoleId = levelConfig.roles[newTier];
      if (newRoleId && !member.roles.cache.has(newRoleId)) {
        await member.roles.add(newRoleId);
      }
    }
    
    logger.info(`Demoted user ${userId} from tier ${oldTier} to ${newTier}.`);
  } catch (err) {
    logger.error(`Failed to execute demotion for user ${userId}:`, err);
  }
}

async function runMonthlyTasks(client) {
  logger.info('Running monthly EXP reset and demotion check...');

  const lastMonth = new Date();
  lastMonth.setDate(0); 
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  const users = db.prepare('SELECT * FROM users').all();

  for (const user of users) {
    const lastMonthData = db.prepare('SELECT exp FROM monthly_exp WHERE user_id = ? AND month = ?').get(user.id, lastMonthStr);
    const lastMonthExp = lastMonthData ? lastMonthData.exp : 0;

    const currentRoleTier = Math.floor(user.level / 10) * 10;

    if (currentRoleTier >= 10) {
      const expNeededForRole = totalExpForLevel(currentRoleTier);
      
      if (lastMonthExp < expNeededForRole) {
        const newTier = currentRoleTier - 10;
        await demoteUser(client, user.id, currentRoleTier, newTier);
      }
    }
  }

  db.prepare('UPDATE users SET current_exp = 0').run();
  logger.info('Monthly current_exp reset completed.');
}

module.exports = (client) => {
  cron.schedule('1 0 1 * *', () => runMonthlyTasks(client), {
    timezone: "Etc/UTC"
  });
  logger.info('Monthly reset task scheduled.');
};
