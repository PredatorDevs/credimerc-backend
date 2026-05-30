const { createPaymentSchema, voidPaymentSchema } = require('./payments.validation');
const paymentsService = require('./payments.service');

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

async function listLoanPayments(req, res, next) {
  try {
    const loanId = Number(req.params.loanId);
    if (!Number.isInteger(loanId) || loanId <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid loanId.' });
    }

    const items = await paymentsService.listLoanPayments({
      companyId: req.company.id,
      loanId
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function createLoanPayment(req, res, next) {
  try {
    const loanId = Number(req.params.loanId);
    if (!Number.isInteger(loanId) || loanId <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid loanId.' });
    }

    const payload = parseSchema(createPaymentSchema, req.body, res);
    if (!payload) return;

    const payment = await paymentsService.createLoanPayment({
      companyId: req.company.id,
      loanId,
      companyUserId: req.auth.companyUserId,
      payload
    });

    return res.status(201).json(payment);
  } catch (error) {
    return next(error);
  }
}

async function voidPayment(req, res, next) {
  try {
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const payload = parseSchema(voidPaymentSchema, req.body, res);
    if (!payload) return;

    const payment = await paymentsService.voidLoanPayment({
      companyId: req.company.id,
      paymentId,
      companyUserId: req.auth.companyUserId,
      reason: payload.reason
    });

    return res.status(200).json(payment);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listLoanPayments,
  createLoanPayment,
  voidPayment
};
