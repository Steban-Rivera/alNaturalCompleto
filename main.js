/* ═══════════════════════════════════════════
   Al Natural · Hecho en Casa — App Logic
   Separado del HTML para integración futura
   con REST API y base de datos MySQL.

   TODO (etapa técnica):
   - Reemplazar mpData / productosData / empaquesData con
     llamadas a fetch('/api/materias-primas'),
     fetch('/api/productos'), fetch('/api/empaques')
   - Guardar cambios con POST/PUT/DELETE
═══════════════════════════════════════════ */

/* ═══════════════════════════════
   STATE — reemplazar con API calls
═══════════════════════════════ */
let mpData        = [];
let productosData = [];
let empaquesData  = []; // [{ id, ml, nombre, costo }]
//let etiquetaCosto = 0;  // costo único de etiqueta, aplica a todos los productos
let prodNextId    = 1;
let mpFilter      = '';
let etiquetaCosto =
    Number(
        localStorage.getItem(
            'etiquetaCosto'
        )
    ) || 0;
// Estado de la Cocina Virtual (sesión actual, no persiste entre recargas)
let ollaIngredientes   = []; // [{ mpId, nombre, cantidad, unidad, costoTotal }]
let costosIndirectos   = 0;  // valor total de gastos indirectos ingresado por el usuario

// Buffer para detección de duplicados antes de crear recetas
let pendingRecetas = [];

/* ─── Carga inicial ─── */
async function loadInitialData() {
  try {

    const ingredientesRes = await fetch(
      'http://localhost:3000/api/ingredientes'
    );

    const ingredientesJson =
      await ingredientesRes.json();

    mpData = (ingredientesJson.data || []).map(i => ({
      id: i.id,
      nombre: i.nombre,
      costoUnidad: Number(i.costo_unidad || 0),
      merma: Number(i.porcentaje_merma || 0),
      categoria_id: i.categoria_id,
      descripcion: i.descripcion
    }));

    const recipientesRes = await fetch(
      'http://localhost:3000/api/recipientes'
    );

    const recipientesJson =
      await recipientesRes.json();

    empaquesData = (recipientesJson.data || []).map(r => ({
      id: r.id,
      nombre: r.nombre,
      ml: Number(r.tamano_recipiente || 0),
      costo: Number(r.valor || 0)
    }));

const productosRes = await fetch(
  'http://localhost:3000/api/productos'
);

const productosJson =
  await productosRes.json();

productosData = [];

for (const p of (productosJson.data || [])) {

  const detalleRes = await fetch(
    `http://localhost:3000/api/productos/${p.id}`
  );

  const detalleJson =
    await detalleRes.json();

  if (!detalleJson.ok) continue;

  const detalle = detalleJson.data;

  const recipiente =
    detalle.recipientes?.[0];

  const gastos =
    detalle.gastos || [];

  const costoIndirecto =
    gastos.reduce(
      (acc, g) => acc + Number(g.valor || 0),
      0
    );

  productosData.push({

    id: detalle.producto.id,

    nombre:
      detalle.producto.nombre,

    recetaBase:
      detalle.producto.nombre
        .replace(/\sx\d+ml$/i, ''),

    tamanoMl:
      Number(
        detalle.producto.cantidad_ml || 0
      ),

    envaId:
      recipiente?.recipiente_id || null,

    costoIndPorMl:
      Number(
        detalle.producto.cantidad_ml || 0
      ) > 0
        ? costoIndirecto /
          Number(detalle.producto.cantidad_ml)
        : 0,

    ingredientes:
      (detalle.ingredientes || []).map(i => ({

        mpId:
          i.ingrediente_id,

        cantidad:
          Number(i.cantidad_ml || 0)

      })),

    costoMlCocina: null,

    ganancia:
      Number(
        detalle.producto.porcentaje_ganancia || 0
      )

  });

}

empNextId = empaquesData.length + 1;


  } catch {
    // Fallback demo si no hay server ni data.json
    mpData = [
      { id: 1, nombre: 'Aceite de coco',      costoUnidad: 18, merma: 5  },
      { id: 2, nombre: 'Manteca de karité',   costoUnidad: 32, merma: 3  },
      { id: 3, nombre: 'Aceite de almendras', costoUnidad: 22, merma: 2  },
      { id: 4, nombre: 'Cera de abejas',      costoUnidad: 28, merma: 8  },
      { id: 5, nombre: 'Aloe vera',           costoUnidad: 12, merma: 15 },
    ];
    empaquesData = [
      { id: 1, ml:   35, nombre: 'Envase 35ml',   costo:  800 },
      { id: 2, ml:  130, nombre: 'Envase 130ml',  costo: 1200 },
      { id: 3, ml:  250, nombre: 'Envase 250ml',  costo: 1600 },
      { id: 4, ml:  370, nombre: 'Envase 370ml',  costo: 2000 },
      { id: 5, ml:  500, nombre: 'Envase 500ml',  costo: 2500 },
      { id: 6, ml: 1000, nombre: 'Envase 1000ml', costo: 3500 },
    ];
    etiquetaCosto = 1000;
    productosData = [
      {
        id: 1,
        nombre:        'Crema Hidratante Natural x250ml',
        tamanoMl:      250,
        recetaBase:    'Crema Hidratante Natural',
        envaId:        3,
        costoIndPorMl: 0,
        ingredientes: [
          { mpId: 1, cantidad: 30 * (250 / 1000) },
          { mpId: 2, cantidad: 20 * (250 / 1000) },
          { mpId: 5, cantidad: 50 * (250 / 1000) },
        ],
        costoMlCocina: null,
        ganancia: 40
      },
    ];
    mpNextId   = 6;
    prodNextId = 2;
    empNextId  = 7;
  }

  renderMP();
  renderEmpaques();
  renderProductos();
  updateStats();
  buildCocinaSelectMP();
  renderEnvasesGrid();
}

/* ═══════════════════════════════
   HELPERS
═══════════════════════════════ */
function fmt(n) {
  if (isNaN(n) || n === null || n === undefined) return '—';
  return '$' + parseFloat(n.toFixed(2)).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function getMp(id)          { return mpData.find(m => m.id === id); }
function getEnvase(id) {
  return empaquesData.find(
    e => String(e.id) === String(id)
  );
}
function getEnvasePorMl(ml) { return empaquesData.find(e => e.ml === ml); }

function costoConMerma(mp, cantidad) {

  const porcentajeMerma =
    (mp.merma || 0) / 100;

  if (porcentajeMerma >= 1) {
    return 0;
  }

  const cantidadReal =
    cantidad / (1 - porcentajeMerma);

  return cantidadReal * mp.costoUnidad;
}

/**
 * Calcula el costo de producción COMPLETO de un producto.
 * Todo es dinámico — nunca usa valores fijos guardados:
 *
 *   costo = Σ ingredientes (con merma, proporcional al tamaño)
 *         + costo del envase  (leído de empaquesData por envaId)
 *         + costo de etiqueta (leído de etiquetaCosto global)
 *         + costos indirectos proporcionales al ml (costoIndPorMl × tamanoMl)
 *
 * Si cambia el precio de una MP, un envase, la etiqueta o los indirectos
 * → todos los productos que los usen se actualizan automáticamente.
 */
function calcCostoProd(prod) {
  const costoIngredientes = (prod.ingredientes || []).reduce((acc, i) => {
    const mp = getMp(i.mpId);
    return mp ? acc + costoConMerma(mp, i.cantidad) : acc;
  }, 0);

  const envase      = prod.envaId ? getEnvase(prod.envaId) : getEnvasePorMl(prod.tamanoMl);
  const costoEnvase = envase ? envase.costo : 0;

  // costoIndPorMl: costo indirecto por ml calculado al momento de crear la receta
  // Se multiplica por el tamaño del envase para obtener la parte que le corresponde
  const costoInd = (prod.costoIndPorMl || 0) * (prod.tamanoMl || 0);

  return costoIngredientes + costoEnvase + etiquetaCosto + costoInd;
}

function calcPrecioSugerido(prod) {
  return calcCostoProd(prod) * (1 + prod.ganancia / 100);
}

/* ═══════════════════════════════
   NAVEGACIÓN
═══════════════════════════════ */
function showView(v, btn) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  btn.classList.add('active');

  if (v === 'materia')   { renderMP(); renderEmpaques(); }
  if (v === 'productos') renderProductos();
  if (v === 'resumen')   updateStats();
  if (v === 'cocina')    { buildCocinaSelectMP(); renderOllaLista(); renderEnvasesGrid(); }
}

function showSubtab(tab) {
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.subview').forEach(v => v.classList.remove('active'));
  document.getElementById('subtab-' + tab).classList.add('active');
  document.getElementById('subview-'  + tab).classList.add('active');
}

/* ═══════════════════════════════
   STATS
═══════════════════════════════ */
function updateStats() {
  document.getElementById('stat-mp').textContent   = mpData.length;
  document.getElementById('stat-prod').textContent = productosData.length;

  if (productosData.length > 0) {
    const avg  = productosData.reduce((a, p) => a + calcCostoProd(p), 0) / productosData.length;
    const avgM = productosData.reduce((a, p) => a + p.ganancia, 0) / productosData.length;
    document.getElementById('stat-avg').textContent    = fmt(avg);
    document.getElementById('stat-margin').textContent = Math.round(avgM) + '%';
  }
}

/* ═══════════════════════════════
   MATERIA PRIMA
═══════════════════════════════ */
function renderMP() {
  const tbody    = document.getElementById('mp-tbody');
  const filtered = mpFilter
    ? mpData.filter(m => m.nombre.toLowerCase().includes(mpFilter.toLowerCase()))
    : mpData;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--texto-soft)">Sin ingredientes registrados aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    const perdida = m.costoUnidad * (m.merma / 100);
    return `
    <tr>
      <td><span class="product-name"><span class="dot"></span>${m.nombre}</span></td>
      <td>${fmt(m.costoUnidad)} / u</td>
      <td><span class="loss-pct">${m.merma}%</span></td>
      <td class="price-loss">${fmt(perdida)} / u</td>
      <td>
        <div class="actions">
          <button class="btn btn-edit" onclick="editMP('${m.id}')">✏️ Editar</button>
          <button class="btn btn-danger" onclick="deleteMP('${m.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterMP(val) { mpFilter = val; renderMP(); }

/* ═══════════════════════════════
   EMPAQUES
   Etiqueta: siempre primera fila, sin botón eliminar.
   Envases: editar precio + eliminar.
═══════════════════════════════ */
function renderEmpaques() {
  const tbody     = document.getElementById('empaques-tbody');
  const ordenados = [...empaquesData].sort((a, b) => a.ml - b.ml);

  const filaEtiqueta = `
    <tr class="etiqueta-row">
      <td><span class="product-name"><span class="dot dot-gold"></span>Etiqueta</span></td>
      <td><span class="empaque-tag">Todos los tamaños</span></td>
      <td>${fmt(etiquetaCosto)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-edit" onclick="openModal('etiqueta')">✏️ Editar</button>
        </div>
      </td>
    </tr>`;

  const filasEnvases = ordenados.length === 0
    ? `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--texto-soft)">Sin envases registrados. Agrega uno con el botón de arriba.</td></tr>`
    : ordenados.map(e => `
    <tr>
      <td><span class="product-name"><span class="dot"></span>${e.nombre}</span></td>
      <td><span class="empaque-tag">${e.ml} ml</span></td>
      <td>${fmt(e.costo)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-edit"   onclick="editEnvase('${e.id}')">✏️ Editar</button>
          <button class="btn btn-danger" onclick="deleteEnvase('${e.id}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');

  tbody.innerHTML = filaEtiqueta + filasEnvases;
}

function saveEtiqueta() {
  const costo = parseFloat(document.getElementById('etiqueta-costo-input').value);
  if (isNaN(costo) || costo < 0) { showToast('⚠️ Ingresa un costo válido', 'var(--rojo)'); return; }
  // TODO: PUT /api/etiqueta
  etiquetaCosto = costo;
  closeModal('etiqueta');
  renderEmpaques();
  renderProductos(); // ← actualización en vivo en todos los productos
  updateStats();
  showToast('✅ Precio de etiqueta actualizado');

  localStorage.setItem(
    'etiquetaCosto',
    etiquetaCosto
);

}

function editEnvase(id) {
  const e = getEnvase(id);

  if (!e) return;

  document.getElementById('envase-edit-id').value = id;
  document.getElementById('envase-modal-title').textContent = 'Editar Envase';
  document.getElementById('envase-ml-input').value = e.ml;
  document.getElementById('envase-ml-input').disabled = true;
  document.getElementById('envase-costo-input').value = e.costo;
  document.getElementById('envase-ml-group').style.opacity = '0.5';

  openModal('envase');
}

async function saveEnvase() {

  const editId = document.getElementById('envase-edit-id').value;

  const ml =
    parseInt(
      document.getElementById('envase-ml-input').value
    );

  const costo =
    parseFloat(
      document.getElementById('envase-costo-input').value
    );

  if (isNaN(costo) || costo < 0) {
    showToast(
      '⚠️ Ingresa un costo válido',
      'var(--rojo)'
    );
    return;
  }

  try {

    let response;

    if (editId) {

      response = await fetch(
        `http://localhost:3000/api/recipientes/${editId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: `Envase ${ml}ml`,
            valor: costo,
            tamano_recipiente: ml
          })
        }
      );

      console.log(
        'STATUS PUT ENVASE:',
        response.status
      );

      const data = await response.json();

      console.log(
        'RESPUESTA PUT ENVASE:',
        data
      );

      showToast('✅ Envase actualizado');

    } else {

      if (isNaN(ml) || ml <= 0) {
        showToast(
          '⚠️ Ingresa un tamaño válido',
          'var(--rojo)'
        );
        return;
      }

      response = await fetch(
        'http://localhost:3000/api/recipientes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: `Envase ${ml}ml`,
            valor: costo,
            tamano_recipiente: ml
          })
        }
      );

      console.log(
        'STATUS POST ENVASE:',
        response.status
      );

      const data = await response.json();

      console.log(
        'RESPUESTA POST ENVASE:',
        data
      );

      showToast('✅ Envase agregado');
    }

    document.getElementById('envase-edit-id').value = '';
    document.getElementById('envase-modal-title').textContent =
      'Agregar Envase';

    document.getElementById('envase-ml-input').value = '';
    document.getElementById('envase-ml-input').disabled = false;

    document.getElementById('envase-costo-input').value = '';

    document.getElementById('envase-ml-group').style.opacity =
      '1';

    closeModal('envase');

    await loadInitialData();

  } catch (err) {

    console.error(
      'ERROR ENVASE:',
      err
    );

    showToast(
      '❌ Error guardando envase',
      'var(--rojo)'
    );
  }
}

async function deleteEnvase(id) {

  const enUso =
    productosData.some(
      p => p.envaId === id
    );

  if (enUso) {
    showToast(
      '⚠️ Este envase está en uso por uno o más productos.',
      'var(--rojo)'
    );
    return;
  }

  const e = getEnvase(id);

  if (!e) return;

  if (
    !confirm(
      `¿Eliminar "${e.nombre}"? Esta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  try {

    const response = await fetch(
      `http://localhost:3000/api/recipientes/${id}`,
      {
        method: 'DELETE'
      }
    );

    console.log(
      'STATUS DELETE ENVASE:',
      response.status
    );

    const data = await response.json();

    console.log(
      'RESPUESTA DELETE ENVASE:',
      data
    );

    showToast(
      '🗑️ Envase eliminado',
      'var(--rojo)'
    );

    await loadInitialData();

  } catch (err) {

    console.error(
      'ERROR DELETE ENVASE:',
      err
    );

    showToast(
      '❌ Error eliminando envase',
      'var(--rojo)'
    );
  }
}

/* ── Modales genéricos ── */
function openModal(type) {
  if (type === 'etiqueta') {
    document.getElementById('etiqueta-costo-input').value = etiquetaCosto || '';
  }
  document.getElementById('modal-' + type).classList.add('open');
}

function closeModal(type) {
  document.getElementById('modal-' + type).classList.remove('open');
}

/* ── Modal MP ── */
function previewMP() {
  const costo   = parseFloat(document.getElementById('mp-costo').value) || 0;
  const merma   = parseFloat(document.getElementById('mp-merma').value) || 0;
  const preview = document.getElementById('mp-preview');
  if (costo > 0) {
    preview.style.display = 'block';
    document.getElementById('mp-preview-val').textContent = fmt(costo * (merma / 100)) + ' / u';
  } else {
    preview.style.display = 'none';
  }
}

function editMP(id) {
  const m = getMp(id);
  document.getElementById('mp-edit-id').value           = id;
  document.getElementById('mp-modal-title').textContent = 'Editar Ingrediente';
  document.getElementById('mp-nombre').value            = m.nombre;
  document.getElementById('mp-costo').value             = m.costoUnidad;
  document.getElementById('mp-merma').value             = m.merma;
  previewMP();
  openModal('mp');
}

async function saveMP() {

  const nombre = document.getElementById('mp-nombre').value.trim();
  const costo  = parseFloat(document.getElementById('mp-costo').value);
  const merma  = parseFloat(document.getElementById('mp-merma').value) || 0;

  if (!nombre || isNaN(costo) || costo <= 0) {
    showToast('⚠️ Completa nombre y costo', 'var(--rojo)');
    return;
  }

  const editId =
    document.getElementById('mp-edit-id').value;

  try {

    let response;

    if (editId) {

      response = await fetch(
        `http://localhost:3000/api/ingredientes/${editId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            categoria_id: null,
            nombre,
            descripcion: '',
            costo_unidad: costo,
            porcentaje_merma: merma
          })
        }
      );

      console.log('STATUS PUT:', response.status);

      const data = await response.json();

      console.log('RESPUESTA PUT:', data);

      showToast('✅ Ingrediente actualizado');

    } else {

      response = await fetch(
        'http://localhost:3000/api/ingredientes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            categoria_id: null,
            nombre,
            descripcion: '',
            costo_unidad: costo,
            porcentaje_merma: merma
          })
        }
      );

      console.log('STATUS POST:', response.status);

      const data = await response.json();

      console.log('RESPUESTA POST:', data);

      showToast('✅ Ingrediente guardado');
    }

    document.getElementById('mp-edit-id').value = '';
    document.getElementById('mp-modal-title').textContent =
      'Agregar Ingrediente';

    document.getElementById('mp-nombre').value = '';
    document.getElementById('mp-costo').value = '';
    document.getElementById('mp-merma').value = '';

    document.getElementById('mp-preview').style.display =
      'none';

    closeModal('mp');

    await loadInitialData();

  } catch (err) {

    console.error('ERROR FETCH:', err);

    showToast(
      '❌ Error guardando ingrediente',
      'var(--rojo)'
    );
  }
}

async function deleteMP(id) {

  const enUso =
    productosData.some(
      p => (p.ingredientes || [])
      .some(i => i.mpId === id)
    );

  const enOlla =
    ollaIngredientes.some(
      i => i.mpId === id
    );

  if (enUso) {
    showToast(
      '⚠️ Este ingrediente está en uso por uno o más productos. Elimina esos productos primero.',
      'var(--rojo)'
    );
    return;
  }

  if (enOlla) {
    showToast(
      '⚠️ Este ingrediente está en la olla actualmente. Retíralo antes de eliminarlo.',
      'var(--rojo)'
    );
    return;
  }

  if (
    !confirm(
      '¿Eliminar este ingrediente? Esta acción no se puede deshacer.'
    )
  ) {
    return;
  }

  try {

    const response = await fetch(
      `http://localhost:3000/api/ingredientes/${id}`,
      {
        method: 'DELETE'
      }
    );

    console.log(
      'STATUS DELETE:',
      response.status
    );

    const data =
      await response.json();

    console.log(
      'RESPUESTA DELETE:',
      data
    );

    showToast(
      '🗑️ Ingrediente eliminado',
      'var(--rojo)'
    );

    await loadInitialData();

  } catch (err) {

    console.error(
      'ERROR DELETE:',
      err
    );

    showToast(
      '❌ Error eliminando ingrediente',
      'var(--rojo)'
    );
  }
}
/* ═══════════════════════════════
   COCINA VIRTUAL
═══════════════════════════════ */

function buildCocinaSelectMP() {
  const select = document.getElementById('cocina-mp-select');
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">— Seleccionar ingrediente —</option>` +
    mpData.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
  if (current) select.value = current;
}

function agregarALaOlla() {
  const mpId    = document.getElementById('cocina-mp-select').value;
  const cantidad = parseFloat(document.getElementById('cocina-cantidad').value);
  const unidad  = document.getElementById('cocina-unidad').value;


  if (!mpId)                         { showToast('⚠️ Selecciona un ingrediente', 'var(--rojo)'); return; }
  if (isNaN(cantidad) || cantidad <= 0) { showToast('⚠️ Ingresa una cantidad válida', 'var(--rojo)'); return; }

  const mp = getMp(mpId);
  if (!mp) return;

  const existente = ollaIngredientes.find(i => i.mpId === mpId);
  if (existente) {
    existente.cantidad  += cantidad;
    existente.costoTotal = costoConMerma(mp, existente.cantidad);
    showToast(`🥄 Se sumaron ${cantidad}${unidad} más de ${mp.nombre}`);
  } else {
    ollaIngredientes.push({ mpId, nombre: mp.nombre, cantidad, unidad, costoTotal: costoConMerma(mp, cantidad) });
    showToast(`🥄 ${mp.nombre} agregado a la olla`);
  }

  document.getElementById('cocina-mp-select').value = '';
  document.getElementById('cocina-cantidad').value  = '';
  renderOllaLista();
  actualizarResumenProduccion();
}

function renderOllaLista() {
  const lista    = document.getElementById('olla-lista');
  const totalRow = document.getElementById('olla-total-row');

  if (ollaIngredientes.length === 0) {
    lista.innerHTML = `<div class="olla-empty">La olla está vacía. Agrega ingredientes arriba.</div>`;
    totalRow.style.display = 'none';
    return;
  }

  const costoTotal = ollaIngredientes.reduce((acc, i) => acc + i.costoTotal, 0);

  lista.innerHTML = ollaIngredientes.map((ingr, idx) => `
    <div class="olla-item" id="olla-item-${idx}">
      <div class="olla-item-info">
        <span class="olla-item-nombre">🌿 ${ingr.nombre}</span>
        <span class="olla-item-costo">${fmt(ingr.costoTotal)}</span>
      </div>
      <div class="olla-item-controls">
        <input type="number" class="olla-item-input" value="${ingr.cantidad}"
               min="0.01" step="0.01"
               onchange="editarCantidadOlla(${idx}, this.value)"
               title="Editar cantidad">
        <span class="olla-item-unidad">${ingr.unidad}</span>
        <button class="olla-item-del" onclick="quitarDeOlla(${idx})" title="Quitar ingrediente">✕</button>
      </div>
    </div>
  `).join('');

  totalRow.style.display = 'flex';
  document.getElementById('olla-costo-total').textContent = fmt(costoTotal);
}

function editarCantidadOlla(idx, val) {
  const cantidad = parseFloat(val);
  if (isNaN(cantidad) || cantidad <= 0) { showToast('⚠️ Ingresa una cantidad válida', 'var(--rojo)'); renderOllaLista(); return; }
  const mp = getMp(ollaIngredientes[idx].mpId);
  ollaIngredientes[idx].cantidad   = cantidad;
  ollaIngredientes[idx].costoTotal = mp ? costoConMerma(mp, cantidad) : 0;
  renderOllaLista();
  actualizarResumenProduccion();
}

function quitarDeOlla(idx) {
  ollaIngredientes.splice(idx, 1);
  renderOllaLista();
  actualizarResumenProduccion();
}

/** Sincroniza la variable costosIndirectos desde el input y actualiza el resumen */
function onCostosIndirectosChange() {
  costosIndirectos = parseFloat(document.getElementById('cocina-costos-indirectos').value) || 0;
  actualizarResumenProduccion();
}

/**
 * Renderiza la grilla de envases en Cocina Virtual.
 * Usa empaquesData → si se agrega/elimina un envase en Empaques,
 * la Cocina Virtual se actualiza automáticamente.
 */
function renderEnvasesGrid() {
  const grid = document.getElementById('envases-grid');
  if (!grid) return;

  const ordenados = [...empaquesData].sort((a, b) => a.ml - b.ml);

  if (ordenados.length === 0) {
    grid.innerHTML = `<div class="olla-empty" style="text-align:center;padding:1.5rem 0;">
      No hay envases configurados. Agrega envases en <strong>Materia Prima → Empaques</strong>.
    </div>`;
    return;
  }

  grid.innerHTML = ordenados.map(e => `
    <div class="envase-row">
      <div class="envase-label">
        <span class="envase-icon">🫙</span>
        <span class="envase-ml">${e.ml} ml</span>
        <span class="envase-costo-ref">${fmt(e.costo)}/u</span>
      </div>
      <div class="envase-input-wrap">
        <input type="number" class="form-input envase-input"
               id="envase-${e.id}"
               placeholder="0" min="0" step="1" value="0"
               oninput="actualizarResumenProduccion()">
        <span class="envase-unit-label">envases</span>
      </div>
    </div>
  `).join('');
}

/**
 * Calcula y muestra el resumen de producción en tiempo real.
 * Costo por envase = ingredientes proporcionales
 *                  + costo del envase
 *                  + etiqueta
 *                  + costos indirectos proporcionales al ml
 */
function actualizarResumenProduccion() {
  const resumen  = document.getElementById('produccion-resumen');
  const btnCrear = document.getElementById('btn-crear-recetas');

  if (ollaIngredientes.length === 0) {
    resumen.style.display  = 'none';
    btnCrear.style.display = 'none';
    return;
  }

  const costoOlla     = ollaIngredientes.reduce((acc, i) => acc + i.costoTotal, 0);
  const costoInd      = costosIndirectos; // total de la ollada
  const costoOllaTotal = costoOlla + costoInd;

  let totalMl = 0;
  const envasesUsados = [];
  const ordenados = [...empaquesData].sort((a, b) => a.ml - b.ml);

  ordenados.forEach(e => {
    const input   = document.getElementById(`envase-${e.id}`);
    if (!input) return;
    const cantidad = parseInt(input.value) || 0;
    if (cantidad > 0) {
      totalMl += cantidad * e.ml;
      envasesUsados.push({ envase: e, cantidad });
    }
  });

  if (totalMl === 0 || costoOlla === 0) {
    resumen.style.display  = 'none';
    btnCrear.style.display = 'none';
    return;
  }

  const costoPorMl    = costoOlla / totalMl;    // solo ingredientes por ml
  const costoIndPorMl = costoInd  / totalMl;    // indirectos por ml

  resumen.style.display = 'block';
  document.getElementById('res-total-ml').textContent     = totalMl.toLocaleString('es-CO') + ' ml';
  document.getElementById('res-costo-unidad').textContent = fmt(costoPorMl + costoIndPorMl) + ' / ml';

  const detalle = document.getElementById('res-envases-detalle');
  detalle.innerHTML = envasesUsados.map(({ envase: e, cantidad }) => {
    const cIngr  = costoPorMl    * e.ml;
    const cInd   = costoIndPorMl * e.ml;
    const cTotal = cIngr + cInd + e.costo + etiquetaCosto;
    const breakdown = costoInd > 0
      ? `(ingr. ${fmt(cIngr)} + indir. ${fmt(cInd)} + env. ${fmt(e.costo)} + etq. ${fmt(etiquetaCosto)})`
      : `(ingr. ${fmt(cIngr)} + env. ${fmt(e.costo)} + etq. ${fmt(etiquetaCosto)})`;
    return `
      <div class="resumen-envase-row">
        <span>🫙 ${e.ml}ml × ${cantidad} envase${cantidad !== 1 ? 's' : ''}
          <span class="resumen-breakdown">${breakdown}</span>
        </span>
        <strong>${fmt(cTotal)} c/u</strong>
      </div>`;
  }).join('');

  btnCrear.style.display = 'block';
}

/**
 * Construye las recetas y detecta duplicados.
 * Cada producto guarda:
 *  - ingredientes con cantidad proporcional al envase (dinámico con precio MP)
 *  - envaId: referencia al envase (dinámico con precio envase)
 *  - costoIndPorMl: costo indirecto por ml (fijo por ollada, proporcional al tamaño en calcCostoProd)
 * El etiquetaCosto se lee de la variable global en calcCostoProd (siempre dinámico).
 */
function crearRecetasAutomaticamente() {
  const nombreBase = document.getElementById('cocina-nombre').value.trim();
  if (!nombreBase)                { showToast('⚠️ Escribe el nombre del producto', 'var(--rojo)'); return; }
  if (ollaIngredientes.length === 0) { showToast('⚠️ La olla está vacía', 'var(--rojo)'); return; }

  let totalMl = 0;
  const ordenados = [...empaquesData].sort((a, b) => a.ml - b.ml);
  ordenados.forEach(e => {
    const input    = document.getElementById(`envase-${e.id}`);
    const cantidad = parseInt(input?.value) || 0;
    if (cantidad > 0) totalMl += cantidad * e.ml;
  });

  if (totalMl === 0) { showToast('⚠️ Ingresa al menos un envase con cantidad mayor a 0', 'var(--rojo)'); return; }

  const costoInd      = costosIndirectos;
  const costoIndPorMl = costoInd / totalMl;  // se guarda en cada producto

  pendingRecetas = [];
  ordenados.forEach(e => {
    const input    = document.getElementById(`envase-${e.id}`);
    const cantidad = parseInt(input?.value) || 0;
    if (cantidad > 0) {
      const proporcion = e.ml / totalMl;
      pendingRecetas.push({
        nombre:        `${nombreBase} x${e.ml}ml`,
        tamanoMl:      e.ml,
        recetaBase:    nombreBase,
        envaId:        e.id,          // referencia dinámica → precio siempre actual
        costoIndPorMl: costoIndPorMl, // fijo por ollada, proporcional en calcCostoProd
        ingredientes: ollaIngredientes.map(i => ({
          mpId:     i.mpId,
          cantidad: parseFloat((i.cantidad * proporcion).toFixed(6))
        })),
        costoMlCocina: null, // nunca guardar valor fijo de ingredientes
        ganancia: 0
      });
    }
  });

  const duplicados = pendingRecetas.filter(r =>
    productosData.some(p => p.nombre.toLowerCase() === r.nombre.toLowerCase())
  );

  if (duplicados.length === 0) { ejecutarCrearRecetas(); return; }

  document.getElementById('duplicado-mensaje').innerHTML =
    `Los siguientes productos <strong>ya existen</strong>. ¿Deseas reemplazar sus recetas con los nuevos datos de la olla?`;
  document.getElementById('duplicado-lista').innerHTML = duplicados.map(d =>
    `<div class="duplicado-item">⚠️ <strong>${d.nombre}</strong></div>`
  ).join('');

  openModal('duplicado');
}

async function ejecutarCrearRecetas() {

  let creados = 0;
  let errores = 0;

  for (const receta of pendingRecetas) {

    try {

      const body = {

        producto: {

          nombre: receta.nombre,
          descripcion: '',
          imagen_url: '',
          cantidad_ml: receta.tamanoMl,
          porcentaje_ganancia: receta.ganancia || 0,
          porcentaje_perdida: 0

        },

        ingredientes: receta.ingredientes.map(i => {

          const mp = getMp(i.mpId);

          return {

            ingrediente_id: i.mpId,
            cantidad_ml: i.cantidad,
            precio_por_ml: mp?.costoUnidad || 0

          };

        }),

        recipientes: [

          {

            recipiente_id: receta.envaId,
            cantidad_unidades: 1

          }

        ],

        gastos: costosIndirectos > 0

          ? [

              {

                nombre: 'Costos indirectos',
                descripcion: 'Costos indirectos de la producción',
                valor: costosIndirectos

              }

            ]

          : []

      };

      const response = await fetch(
        'http://localhost:3000/api/productos/completo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      console.log('STATUS PRODUCTO:', response.status);
      console.log('RESPUESTA PRODUCTO:', data);

      if (response.ok) {
        creados++;
      } else {
        errores++;
      }

    } catch (error) {

      console.error(error);
      errores++;

    }

  }

  await loadInitialData();

  resetCocinaVirtual();

  pendingRecetas = [];

  closeModal('duplicado');

  if (creados > 0) {

    showToast(
      `✅ ${creados} producto(s) creado(s) correctamente`
    );

  }

  if (errores > 0) {

    showToast(
      `⚠️ ${errores} producto(s) no pudieron crearse`,
      'var(--rojo)'
    );

  }

  renderProductos();

  updateStats();

  setTimeout(() => {

    const btn =
      document.querySelector('.nav-btn:nth-child(4)');

    if (btn) {
      showView('productos', btn);
    }

  }, 1200);

}


function confirmarReemplazoDuplicados() { ejecutarCrearRecetas(); }

function resetCocinaVirtual() {
  ollaIngredientes = [];
  costosIndirectos = 0;
  document.getElementById('cocina-nombre').value             = '';
  document.getElementById('cocina-mp-select').value          = '';
  document.getElementById('cocina-cantidad').value           = '';
  document.getElementById('cocina-costos-indirectos').value  = '';
  const ordenados = [...empaquesData].sort((a, b) => a.ml - b.ml);
  ordenados.forEach(e => {
    const input = document.getElementById(`envase-${e.id}`);
    if (input) input.value = '0';
  });
  renderOllaLista();
  actualizarResumenProduccion();
}

/* ═══════════════════════════════
   PRODUCTOS — render
═══════════════════════════════ */
function renderProductos() {
  const grid = document.getElementById('products-grid');

  if (productosData.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🍲</div>
      <h3>Sin productos aún</h3>
      <p>Crea tus recetas desde la <strong>Cocina Virtual</strong> y aparecerán aquí.</p>
    </div>`;
    return;
  }

  const grupos = {};
  productosData.forEach(p => {
    const base = p.recetaBase || p.nombre;
    if (!grupos[base]) grupos[base] = [];
    grupos[base].push(p);
  });

  grid.innerHTML = Object.entries(grupos).map(([base, prods]) => {
    const cardsHTML = prods.map(p => {
      const costo  = calcCostoProd(p);
      const precio = calcPrecioSugerido(p);

      const ingrHTML = (p.ingredientes || []).map(i => {
        const mp = getMp(i.mpId);
        if (!mp) return '';
        const c = costoConMerma(mp, i.cantidad);
        return `<div class="ingredient-row">
          <span class="ingr-name">🌿 ${mp.nombre}</span>
          <span class="ingr-grams">${parseFloat(i.cantidad.toFixed(4))} u</span>
          <span class="ingr-cost">${fmt(c)}</span>
        </div>`;
      }).join('');

      const envase      = p.envaId ? getEnvase(p.envaId) : getEnvasePorMl(p.tamanoMl);
      const costoEnvase = envase ? envase.costo : 0;
      const costoInd    = (p.costoIndPorMl || 0) * (p.tamanoMl || 0);

      const empHTML = `
        <div class="ingredient-row empaque-row">
          <span class="ingr-name">🫙 ${envase ? envase.nombre : 'Envase ' + p.tamanoMl + 'ml'}</span>
          <span class="ingr-grams">1 u</span>
          <span class="ingr-cost">${fmt(costoEnvase)}</span>
        </div>
        <div class="ingredient-row empaque-row">
          <span class="ingr-name">🏷️ Etiqueta</span>
          <span class="ingr-grams">1 u</span>
          <span class="ingr-cost">${fmt(etiquetaCosto)}</span>
        </div>
        ${costoInd > 0 ? `
        <div class="ingredient-row empaque-row">
          <span class="ingr-name">⚙️ Costos indirectos</span>
          <span class="ingr-grams">${p.tamanoMl} ml</span>
          <span class="ingr-cost">${fmt(costoInd)}</span>
        </div>` : ''}`;

      return `
      <div class="product-card">
        <div class="card-header">
          <div class="card-product-name">${p.nombre}</div>
          <div class="card-actions">
            <button
              class="icon-btn icon-btn-edit"
              title="Ajustar ganancia"
              onclick="openGananciaModal('${p.id}')"
              📈
            </button>

            <button
              class="icon-btn icon-btn-del"
              title="Eliminar producto"
              onclick="deleteProd('${p.id}')"
              🗑️
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="ingredients-title">📋 Composición del costo</div>
          ${ingrHTML}
          <div class="empaque-divider">🫙 Empaque y otros</div>
          ${empHTML}
          <div class="card-financials">
            <div class="fin-block">
              <label>Costo Total</label>
              <div class="fin-value">${fmt(costo)}</div>
            </div>
            <div class="fin-divider"></div>
            <div class="fin-block">
              <label>Ganancia</label>
              <div class="fin-value">${p.ganancia}%</div>
            </div>
            <div class="fin-divider"></div>
            <div class="fin-block">
              <label>Precio Sugerido</label>
              <div class="fin-value highlight">${fmt(precio)}</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="producto-grupo">
      <div class="grupo-titulo">🌿 ${base}</div>
      <div class="grupo-cards">${cardsHTML}</div>
    </div>`;
  }).join('');
}

/* ── Modal Ganancia ── */
function openGananciaModal(id) {
  const p = productosData.find(x => x.id === id);
  if (!p) return;
  document.getElementById('ganancia-prod-id').value           = id;
  document.getElementById('ganancia-prod-nombre').textContent = p.nombre;
  document.getElementById('ganancia-valor').value             = p.ganancia || '';
  document.getElementById('ganancia-preview').style.display   = 'none';
  previewGanancia();
  openModal('ganancia');
}

function previewGanancia() {
  const id       = document.getElementById('ganancia-prod-id').value;
  const ganancia = parseFloat(document.getElementById('ganancia-valor').value) || 0;
  const p        = productosData.find(x => x.id === id);
  if (!p) return;
  document.getElementById('ganancia-preview').style.display   = 'block';
  document.getElementById('ganancia-precio-val').textContent  = fmt(calcCostoProd(p) * (1 + ganancia / 100));
}

async function saveGanancia() {

  const id =
    document.getElementById('ganancia-prod-id').value;

  const ganancia =
    parseFloat(
      document.getElementById('ganancia-valor').value
    );

  if (isNaN(ganancia) || ganancia < 0) {

    showToast(
      '⚠️ Ingresa un porcentaje válido',
      'var(--rojo)'
    );

    return;

  }

  try {

    const response = await fetch(

      `http://localhost:3000/api/productos/${id}/ganancia`,

      {

        method: 'PUT',

        headers: {

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          porcentaje_ganancia: ganancia

        })

      }

    );

    const data =
      await response.json();

    console.log(data);

    await loadInitialData();

    closeModal('ganancia');

    renderProductos();

    updateStats();

    showToast(
      '✅ Ganancia actualizada'
    );

  } catch (error) {

    console.error(error);

    showToast(
      '❌ Error actualizando ganancia',
      'var(--rojo)'
    );

  }

}

async function deleteProd(id) {

  const p = productosData.find(x => x.id === id);

  if (!p) return;

  if (
    !confirm(
      `¿Eliminar "${p.nombre}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  try {

    const response = await fetch(
      `http://localhost:3000/api/productos/${id}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    console.log(data);

    await loadInitialData();

    renderProductos();

    updateStats();

    showToast(
      '🗑️ Producto eliminado',
      'var(--rojo)'
    );

  } catch (error) {

    console.error(error);

    showToast(
      '❌ Error eliminando producto',
      'var(--rojo)'
    );

  }

}

/* ═══════════════════════════════
   TOAST
═══════════════════════════════ */
function showToast(msg, bg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.style.background = bg || 'var(--verde-oscuro)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();

  const splash = document.getElementById('splash-overlay');
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => { splash.remove(); }, 800);
  }, 1800);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        const id = overlay.id.replace('modal-', '');
        if (id === 'envase') {
          document.getElementById('envase-edit-id').value           = '';
          document.getElementById('envase-modal-title').textContent = 'Agregar Envase';
          document.getElementById('envase-ml-input').disabled       = false;
          document.getElementById('envase-ml-group').style.opacity  = '1';
        }
        closeModal(id);
      }
    });
  });
});
