const service = require('../services/produccion.service');

async function create(req, res, next) {
  try {
    const p = await service.createProduccion(req.body);
    res.status(201).json(p);
  } catch (err) { next(err); }
}

async function addIngrediente(req, res, next) {
  try {
    const p = await service.addIngrediente(req.params.id, req.body);
    res.status(201).json(p);
  } catch (err) { next(err); }
}

async function addResultado(req, res, next) {
  try {
    const p = await service.addResultado(req.params.id, req.body);
    res.status(201).json(p);
  } catch (err) { next(err); }
}

async function addGasto(req, res, next) {
  try {
    const g = await service.addGastoProduccion(req.params.id, req.body);
    res.status(201).json(g);
  } catch (err) { next(err); }
}

async function getDetalles(req, res, next) {
  try {
    const d = await service.getProduccionDetalles(req.params.id);
    if (!d) return res.status(404).json({ message: 'Produccion no encontrada' });
    res.json(d);
  } catch (err) { next(err); }
}

module.exports = { create, addIngrediente, addResultado, addGasto, getDetalles };
