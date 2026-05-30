const { createCompanySchema } = require('./companies.validation');
const companiesService = require('./companies.service');

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

async function createCompany(req, res, next) {
  try {
    const payload = parseSchema(createCompanySchema, req.body, res);
    if (!payload) return;

    const data = await companiesService.createCompanyWithBootstrap({
      userId: req.auth.userId,
      payload
    });

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

async function listCompanies(req, res, next) {
  try {
    const items = await companiesService.listUserCompanies({ userId: req.auth.userId });
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCompany,
  listCompanies
};
