const prisma = require('../config/prisma');

const listarIngredientes = async () => {

    const resultado = await prisma.$queryRawUnsafe(`
        CALL sp_listar_ingredientes();
    `);

    console.log('RESULTADO SP:', resultado);

    return resultado;
};

module.exports = {
    listarIngredientes
};