const prisma = require('../config/prisma');
const util = require('../utils/produccion.util');

async function createProduccion(data) {
  return prisma.produccion.create({ data: { nombre: data.nombre } });
}

async function addIngrediente(produccionId, ingrediente) {
  return prisma.produccionIngrediente.create({ data: { produccion_id: produccionId, ingrediente_id: ingrediente.ingrediente_id, cantidad_usada: ingrediente.cantidad_usada } });
}

async function addResultado(produccionId, resultado) {
  return prisma.produccionResultado.create({ data: { produccion_id: produccionId, recipiente_id: resultado.recipiente_id, cantidad_envases: resultado.cantidad_envases } });
}

async function addGastoProduccion(produccionId, gasto) {
  return prisma.gastos.create({ data: { produccion_id: produccionId, nombre: gasto.nombre, descripcion: gasto.descripcion, valor: gasto.valor } });
}

async function getProduccionDetalles(produccionId) {
  const produccion = await prisma.produccion.findUnique({
    where: { id: produccionId },
    include: {
      ingredientes: true,
      resultados: { include: { recipiente: true } },
      productos: { include: { produccion_resultado: { include: { recipiente: true } } } },
    },
  });

  if (!produccion) return null;

  const costoIngredientes = await util.calcularCostoIngredientes(produccionId);
  const totalMl = await util.calcularMlProducidos(produccionId);
  const gastoIndirectoPorMl = await util.calcularGastosIndirectosPorMl(produccionId, totalMl);
  const costoTotalProduccion = costoIngredientes + gastoIndirectoPorMl * totalMl;
  const costoPorMl = totalMl > 0 ? costoTotalProduccion / totalMl : 0;

  const detallesResultados = produccion.resultados.map((res) => {
    const tam = Number(res.recipiente?.tamano_recipiente ?? 0);
    const mlGenerados = Number(res.cantidad_envases) * tam;
    return {
      id: res.id,
      recipiente_id: res.recipiente_id,
      cantidad_envases: res.cantidad_envases,
      ml_generados: mlGenerados,
      costo_por_ml: Number(costoPorMl.toFixed(6)),
    };
  });

  const costoEtiqueta = Number((await prisma.configuracionSistema.findFirst())?.costoEtiqueta ?? 0);

  const productos = produccion.productos.map((p) => {
    const resultado = p.produccion_resultado;
    const contenido_ml = Number(resultado?.recipiente?.tamano_recipiente ?? 0);
    const costoEnvase = Number(resultado?.recipiente?.valor ?? 0);
    const costoUnitario = costoPorMl * contenido_ml + costoEnvase + costoEtiqueta;
    const precioFinal = util.aplicarMargen(costoUnitario, p.porcentaje_ganancia);

    return {
      id: p.id,
      nombre: p.nombre,
      cantidad_ml: contenido_ml,
      costoUnitario: Number(costoUnitario.toFixed(4)),
      precioFinal: precioFinal == null ? null : Number(precioFinal.toFixed(2)),
    };
  });

  return {
    produccion: { id: produccion.id, nombre: produccion.nombre, creado_en: produccion.creado_en },
    totales: {
      costoIngredientes: Number(costoIngredientes.toFixed(4)),
      totalMl,
      gastoIndirectoPorMl: Number(gastoIndirectoPorMl.toFixed(6)),
      costoTotalProduccion: Number(costoTotalProduccion.toFixed(4)),
      costoPorMl: Number(costoPorMl.toFixed(6)),
    },
    resultados: detallesResultados,
    productos,
  };
}

module.exports = {
  createProduccion,
  addIngrediente,
  addResultado,
  addGastoProduccion,
  getProduccionDetalles,
};
