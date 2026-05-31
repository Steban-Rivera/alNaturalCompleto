const prisma = require('../config/prisma');

async function getRecipienteMl(recipiente_id) {
  const r = await prisma.tiposRecipientes.findUnique({ where: { id: recipiente_id } });
  return r ? Number(r.tamano_recipiente) : 0;
}

async function calcularCostoIngredientes(produccionId) {
  // Sum cost of ingredients used in a production, using current ingredient prices
  const items = await prisma.produccionIngrediente.findMany({ where: { produccion_id: produccionId } });
  let total = 0;
  for (const it of items) {
    const ing = await prisma.ingredientes.findUnique({ where: { id: it.ingrediente_id } });
    const costo_unidad = Number(ing?.costo_unidad ?? 0);
    const porcentaje_merma = Number(ing?.porcentaje_merma ?? 0);
    const cantidad = Number(it.cantidad_usada ?? 0);
    const factorMerma = 1 - porcentaje_merma / 100;
    total += factorMerma > 0 ? (cantidad * costo_unidad) / factorMerma : 0;
  }
  return total;
}

async function calcularMlProducidos(produccionId) {
  // Sum total ml produced from resultados
  const resultados = await prisma.produccionResultado.findMany({ where: { produccion_id: produccionId } });
  let totalMl = 0;
  for (const res of resultados) {
    const tam = await getRecipienteMl(res.recipiente_id);
    totalMl += Number(res.cantidad_envases) * tam;
  }
  return totalMl;
}

async function calcularGastosIndirectosPorMl(produccionId, totalMl) {
  if (totalMl <= 0) return 0;
  const gastos = await prisma.gastos.findMany({ where: { produccion_id: produccionId } });
  const totalGastos = gastos.reduce((s, g) => s + Number(g.valor ?? 0), 0);
  return totalGastos / totalMl;
}

function aplicarMargen(precioCosto, porcentaje_ganancia) {
  const pct = Number(porcentaje_ganancia ?? 0);
  if (pct >= 100) return null; // invalid
  return precioCosto / (1 - pct / 100);
}

module.exports = {
  getRecipienteMl,
  calcularCostoIngredientes,
  calcularMlProducidos,
  calcularGastosIndirectosPorMl,
  aplicarMargen,
};
