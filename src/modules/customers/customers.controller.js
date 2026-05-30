const {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema
} = require('./customers.validation');
const customersService = require('./customers.service');

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

async function listCustomers(req, res, next) {
  try {
    const query = parseSchema(listCustomersQuerySchema, req.query, res);
    if (!query) return;

    const data = await customersService.listCustomers({
      companyId: req.company.id,
      query
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const payload = parseSchema(createCustomerSchema, req.body, res);
    if (!payload) return;

    const customer = await customersService.createCustomer({
      companyId: req.company.id,
      companyUserId: req.auth.companyUserId,
      payload
    });

    return res.status(201).json(customer);
  } catch (error) {
    return next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const customer = await customersService.getCustomerById({
      companyId: req.company.id,
      id
    });

    if (!customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    return next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const payload = parseSchema(updateCustomerSchema, req.body, res);
    if (!payload) return;

    const customer = await customersService.updateCustomer({
      companyId: req.company.id,
      id,
      payload
    });

    if (!customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    return next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const deactivated = await customersService.deactivateCustomer({
      companyId: req.company.id,
      id
    });

    if (!deactivated) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer
};
