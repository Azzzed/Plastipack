const Order = require('../models/Order');
const Reference = require('../models/Reference');

/**
 * Lista los pedidos del vendedor que está logueado.
 * Los jefes/admin pueden ver todos.
 */
exports.listarPedidos = async (req, res, next) => {
  try {
    const filtro = ['admin', 'jefe'].includes(req.user.rol)
      ? {}
      : { vendedor: req.user._id };

    const pedidos = await Order.find(filtro)
      .populate('vendedor', 'nombre email')
      .populate('items.referencia', 'sku nombre tipo')
      .sort('-createdAt')
      .lean({ virtuals: true });

    res.render('vendedor/mis-pedidos', {
      titulo: 'Pedidos',
      pedidos,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Renderiza el formulario de creación de pedido.
 * Carga las referencias activas para que el vendedor las seleccione.
 */
exports.formularioNuevo = async (req, res, next) => {
  try {
    const referencias = await Reference.find({ activo: true })
      .select('sku nombre tipo destino')
      .sort('sku')
      .limit(200)
      .lean();

    const min = new Date();
    min.setDate(min.getDate() + 15);
    const fechaMinima = min.toISOString().split('T')[0];

    res.render('vendedor/nuevo-pedido', {
      titulo: 'Nuevo pedido',
      referencias,
      fechaMinima,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Endpoint AJAX para buscar referencias por SKU/nombre.
 */
exports.buscarReferencias = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const refs = await Reference.find({
      activo: true,
      $or: [{ sku: regex }, { nombre: regex }],
    })
      .select('sku nombre tipo destino materiaPrima')
      .limit(20)
      .lean();

    res.json(refs);
  } catch (err) {
    next(err);
  }
};

/**
 * Crea un nuevo pedido.
 *
 * ── BUG FIX ──────────────────────────────────────────────────────────────────
 * express.urlencoded({ extended: true }) usa la librería `qs` para parsear el
 * body. `qs` convierte "items[ref]" en la clave ANIDADA req.body.items.ref, NO
 * en la clave literal req.body['items[ref]']. El código anterior usaba el
 * nombre literal → siempre era undefined → "Debes agregar al menos una
 * referencia" aunque el carrito tuviese ítems.
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.crearPedido = async (req, res, next) => {
  try {
    const { clienteNombre, clienteContacto, destino, fechaEntrega, notas } = req.body;

    // qs parsea items[ref], items[cantidad], items[valor] como:
    //   req.body.items = { ref: [...], cantidad: [...], valor: [...] }
    // Para un único ítem los valores son strings; [].concat() los normaliza a arrays.
    const itemsBody = req.body.items || {};
    const refs  = [].concat(itemsBody.ref      || []);
    const cants = [].concat(itemsBody.cantidad || []);
    const vals  = [].concat(itemsBody.valor    || []);

    if (refs.length === 0) {
      req.flash('error', 'Debes agregar al menos una referencia al pedido.');
      return res.redirect('/pedidos/nuevo');
    }

    const items = refs
      .map((ref, i) => ({
        referencia: ref,
        cantidad: Number(cants[i]),
        valorUnitario: Number(vals[i]),
        // PDF §5: "Al momento de crearse, el pedido pasa automáticamente a producción"
        estado: 'en_produccion',
      }))
      .filter(it => it.referencia && it.cantidad > 0);

    if (items.length === 0) {
      req.flash('error', 'Los ítems del pedido no son válidos. Verifica cantidades.');
      return res.redirect('/pedidos/nuevo');
    }

    const pedido = await Order.create({
      vendedor: req.user._id,
      cliente: { nombre: clienteNombre, contacto: clienteContacto },
      destino,
      items,
      fechaEntrega: new Date(fechaEntrega),
      notas,
    });

    req.flash('success', `Pedido ${pedido.numero} creado correctamente.`);
    res.redirect('/pedidos');
  } catch (err) {
    if (err.name === 'ValidationError') {
      req.flash('error', Object.values(err.errors).map(e => e.message).join(' · '));
      return res.redirect('/pedidos/nuevo');
    }
    next(err);
  }
};

/**
 * Vista detalle de un pedido. Los jefes pueden cambiar estados de cada ítem.
 */
exports.verPedido = async (req, res, next) => {
  try {
    const pedido = await Order.findById(req.params.id)
      .populate('vendedor', 'nombre email')
      .populate('items.referencia')
      .lean({ virtuals: true });

    if (!pedido) {
      req.flash('error', 'Pedido no encontrado.');
      return res.redirect('/pedidos');
    }

    if (
      req.user.rol === 'vendedor' &&
      pedido.vendedor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).render('error', {
        titulo: 'Acceso denegado',
        mensaje: 'Solo puedes ver tus propios pedidos.',
      });
    }

    res.render('vendedor/detalle-pedido', { titulo: pedido.numero, pedido });
  } catch (err) {
    next(err);
  }
};

/**
 * Cambio de estado de un ítem del pedido (lo hace el Jefe de Producción).
 */
exports.cambiarEstadoItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { estado } = req.body;
    const pedido = await Order.findById(id);
    if (!pedido) return res.redirect('/pedidos');

    const item = pedido.items.id(itemId);
    if (!item) return res.redirect('/pedidos/' + id);

    item.estado = estado;
    pedido.recalcularEstadoGeneral();
    await pedido.save();

    req.flash('success', 'Estado actualizado.');
    res.redirect('/pedidos/' + id);
  } catch (err) {
    next(err);
  }
};
