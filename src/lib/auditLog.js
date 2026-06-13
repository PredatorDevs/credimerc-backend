const db = require('./db');

async function recordAudit({
  companyId = null,
  userId = null,
  companyUserId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) {
  if (!action || !entityType) {
    return;
  }

  const stringify = (value) => {
    if (value === undefined || value === null) return null;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return null;
    }
  };

  await db.execute(
    `
      INSERT INTO audit_logs (
        company_id,
        user_id,
        company_user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        :companyId,
        :userId,
        :companyUserId,
        :action,
        :entityType,
        :entityId,
        :oldValues,
        :newValues,
        :ipAddress,
        :userAgent,
        CURRENT_TIMESTAMP
      )
    `,
    {
      companyId,
      userId,
      companyUserId,
      action,
      entityType,
      entityId,
      oldValues: stringify(oldValues),
      newValues: stringify(newValues),
      ipAddress,
      userAgent
    }
  );
}

module.exports = {
  recordAudit
};
