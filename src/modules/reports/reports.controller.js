const {
  dateRangeQuerySchema,
  overdueLoansQuerySchema,
  dailyPaymentsQuerySchema,
  collectorPaymentsQuerySchema
} = require('./reports.validation');
const reportsService = require('./reports.service');
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

async function recordReportAudit({ req, action, params }) {
  try {
    const { ipAddress, userAgent } = extractClientContext(req);
    await recordAudit({
      companyId: req.company.id,
      userId: req.auth.userId,
      companyUserId: req.auth.companyUserId,
      action,
      entityType: 'reports',
      entityId: null,
      oldValues: null,
      newValues: params,
      ipAddress,
      userAgent
    });
  } catch (_) {
    // Audit failures should not fail report retrieval.
  }
}

async function portfolio(req, res, next) {
  try {
    const query = parseSchema(dateRangeQuerySchema, req.query, res);
    if (!query) return;

    const data = await reportsService.getPortfolioReport({
      companyId: req.company.id
    });

    await recordReportAudit({ req, action: 'REPORT_PORTFOLIO_VIEWED', params: query });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function overdueLoans(req, res, next) {
  try {
    const query = parseSchema(overdueLoansQuerySchema, req.query, res);
    if (!query) return;

    const data = await reportsService.getOverdueLoansReport({
      companyId: req.company.id,
      query
    });

    await recordReportAudit({ req, action: 'REPORT_OVERDUE_LOANS_VIEWED', params: query });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function dailyPayments(req, res, next) {
  try {
    const query = parseSchema(dailyPaymentsQuerySchema, req.query, res);
    if (!query) return;

    const data = await reportsService.getDailyPaymentsReport({
      companyId: req.company.id,
      query
    });

    await recordReportAudit({ req, action: 'REPORT_DAILY_PAYMENTS_VIEWED', params: query });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function collectorPayments(req, res, next) {
  try {
    const query = parseSchema(collectorPaymentsQuerySchema, req.query, res);
    if (!query) return;

    const data = await reportsService.getCollectorPaymentsReport({
      companyId: req.company.id,
      query
    });

    await recordReportAudit({ req, action: 'REPORT_COLLECTOR_PAYMENTS_VIEWED', params: query });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  portfolio,
  overdueLoans,
  dailyPayments,
  collectorPayments
};
