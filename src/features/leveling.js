const db = require('../utils/database');
const logger = require('../utils/logger');

function totalExpForLevel(level) {
  if (level <= 1) return 0;
  return 16000 * Math.pow(level / 60, 2);
}

function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
    user = { id: userId, current_exp: 0, total_exp: 0, level: 1 };
  }
  return user;
}

async function handleRoleRewards(guild, member, newLevel) {
  const levelConfig = require('../../config.json').levelConfig;
  if (!levelConfig || !levelConfig.roles) return;

  const roleTier = Math.floor(newLevel / 10) * 10;
  if (roleTier < 10) return;

  const roleIdToAssign = levelConfig.roles[roleTier];
  if (!roleIdToAssign) return;

  const rolesToRemove = [];
  for (const [level, rId] of Object.entries(levelConfig.roles)) {
    if (rId !== roleIdToAssign && member.roles.cache.has(rId)) {
      rolesToRemove.push(rId);
    }
  }

  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove).catch(err => logger.error(`Failed to remove old roles:`, err));
  }

  if (!member.roles.cache.has(roleIdToAssign)) {
    await member.roles.add(roleIdToAssign).catch(err => logger.error(`Failed to add role ${roleIdToAssign}:`, err));
    logger.info(`Assigned role for level ${roleTier} to user ${member.id}.`);
  }
}

async function addExp(message, expToAdd) {
  const { author, guild, member } = message;
  const user = getUser(author.id);
  
  // current_exp is for monthly tracking, total_exp is for leveling
  user.current_exp += expToAdd;
  user.total_exp += expToAdd;

  let newLevel = user.level;
  let requiredExp = totalExpForLevel(newLevel + 1);

  while (user.total_exp >= requiredExp) {
    newLevel++;
    requiredExp = totalExpForLevel(newLevel + 1);
  }

  db.prepare('UPDATE users SET current_exp = ?, total_exp = ?, level = ? WHERE id = ?')
    .run(user.current_exp, user.total_exp, newLevel, author.id);

  if (newLevel > user.level) {
    logger.info(`User ${author.id} leveled up to ${newLevel}!`);
    await handleRoleRewards(guild, member, newLevel);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  db.prepare(`
    INSERT INTO monthly_exp (user_id, month, exp) VALUES (?, ?, ?)
    ON CONFLICT(user_id, month) DO UPDATE SET exp = exp + ?
  `).run(author.id, currentMonth, expToAdd, expToAdd);
}

module.exports = {
  addExp,
  getUser,
  totalExpForLevel
};
