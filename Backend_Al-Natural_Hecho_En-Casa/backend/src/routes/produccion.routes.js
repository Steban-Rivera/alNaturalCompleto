const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/produccion.controller');

router.post('/', ctrl.create);
router.get('/:id', ctrl.getDetalles);
router.post('/:id/ingrediente', ctrl.addIngrediente);
router.post('/:id/resultado', ctrl.addResultado);
router.post('/:id/gasto', ctrl.addGasto);

module.exports = router;
