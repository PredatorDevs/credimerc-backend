const {
  createLoanSchema,
  updateLoanSchema,
  cancelLoanSchema,
  listLoansQuerySchema
} = require('./loans.validation');
const loansService = require('./loans.service');

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

async function listLoans(req, res, next) {
  try {
    const query = parseSchema(listLoansQuerySchema, req.query, res);
    if (!query) return;

    const data = await loansService.listLoans({
      companyId: req.company.id,
      query
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function createLoan(req, res, next) {
  try {
    const payload = parseSchema(createLoanSchema, req.body, res);
    if (!payload) return;

    const loan = await loansService.createLoan({
      companyId: req.company.id,
      companyUserId: req.auth.companyUserId,
      payload
    });

    return res.status(201).json(loan);
  } catch (error) {
    return next(error);
  }
}

async function getLoan(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const loan = await loansService.getLoanById({
      companyId: req.company.id,
      id
    });

    if (!loan) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Loan not found.' });
    }

    return res.status(200).json(loan);
  } catch (error) {
    return next(error);
  }
}

async function updateLoan(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const payload = parseSchema(updateLoanSchema, req.body, res);
    if (!payload) return;

    const loan = await loansService.updateLoan({
      companyId: req.company.id,
      id,
      payload
    });

    if (!loan) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Loan not found.' });
    }

    return res.status(200).json(loan);
  } catch (error) {
    return next(error);
  }
}

async function cancelLoan(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const payload = parseSchema(cancelLoanSchema, req.body, res);
    if (!payload) return;

    const loan = await loansService.cancelLoan({
      companyId: req.company.id,
      id,
      companyUserId: req.auth.companyUserId,
      reason: payload.reason
    });

    if (!loan) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Loan not found.' });
    }

    return res.status(200).json(loan);
  } catch (error) {
    return next(error);
  }
}

async function overdueLoans(req, res, next) {
  try {
    const items = await loansService.listOverdueLoans({
      companyId: req.company.id
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listLoans,
  createLoan,
  getLoan,
  updateLoan,
  cancelLoan,
  overdueLoans
};
