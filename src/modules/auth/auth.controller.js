const authenticate = require('../../middlewares/authenticate');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  selectCompanySchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('./auth.validation');
const authService = require('./auth.service');
const { recordAudit } = require('../../lib/auditLog');

function parseSchema(schema, data, res) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Validation failed.',
      details: parsed.error.flatten()
    });
    return null;
  }

  return parsed.data;
}

function extractClientContext(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  };
}

async function register(req, res, next) {
  try {
    const payload = parseSchema(registerSchema, req.body, res);
    if (!payload) return;

    const data = await authService.register({ payload });
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const payload = parseSchema(loginSchema, req.body, res);
    if (!payload) return;

    const context = extractClientContext(req);
    const data = await authService.login({ payload, ...context });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const payload = parseSchema(refreshSchema, req.body, res);
    if (!payload) return;

    const context = extractClientContext(req);
    const data = await authService.refresh({ refreshToken: payload.refreshToken, ...context });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const payload = parseSchema(logoutSchema, req.body, res);
    if (!payload) return;

    await authService.logout({ refreshToken: payload.refreshToken });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function selectCompany(req, res, next) {
  try {
    const payload = parseSchema(selectCompanySchema, req.body, res);
    if (!payload) return;

    const data = await authService.selectCompany({
      userId: req.auth.userId,
      companyId: payload.companyId
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const payload = parseSchema(forgotPasswordSchema, req.body, res);
    if (!payload) return;

    const context = extractClientContext(req);
    const data = await authService.forgotPassword({
      email: payload.email,
      ...context
    });

    if (data?.userId) {
      await recordAudit({
        companyId: null,
        userId: data.userId,
        companyUserId: null,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'users',
        entityId: data.userId,
        oldValues: null,
        newValues: { email: payload.email.toLowerCase() },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    }

    return res.status(202).json({
      message: 'If the email exists, a reset token has been issued.'
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const payload = parseSchema(resetPasswordSchema, req.body, res);
    if (!payload) return;

    const context = extractClientContext(req);
    const data = await authService.resetPassword({
      token: payload.token,
      newPassword: payload.newPassword,
      ...context
    });

    await recordAudit({
      companyId: null,
      userId: data.userId,
      companyUserId: null,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'users',
      entityId: data.userId,
      oldValues: null,
      newValues: { tokenId: data.tokenId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.getAuthProfile({
      userId: req.auth.userId,
      preferredCompanyId: req.auth.activeCompanyId
    });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

const withAuth = [authenticate];

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  selectCompany,
  me,
  withAuth
};
