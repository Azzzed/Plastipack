const Order = require('../models/Order');
const ProductionLog = require('../models/ProductionLog');
const Reference = require('../models/Reference');

/**
 * Pantalla principal del operario:
 *   - Selector de selladora (1..5)
 *   - Lista de items en producción (planilla del día)
 *   - Formulario para registrar el turno terminado
 *   - Tabla con sus últimos registros
 */
exports.dashboardOperario = async (req, res, next) => {
  try {
    const selladora = Number(req.query.selladora) || req.user.selladoraDefault || 1;

    // Items que se pueden producir = todos los que están en_produccion (no completados)
    // Una misma referencia puede aparecer en múltiples pedidos en producción simultáneamente.
    const ordenes = await Order.find({ 'items.estado': 'en_produccion' })
      .populate('items.referencia', 'sku nombre tipo')
      .sort('fechaEntrega')
      .lean({ virtuals: true });

    // Aplanamos a "items disponibles para producir" — cada uno conserva su orderId
    const itemsDisponibles = [];
    for (const o of ordenes) {
      for (const it of o.items) {
        if (it.estado !== 'en_produccion') continue;
        const pendiente = Math.max(0, it.cantidad - (it.producido || 0));
        if (pendiente <= 0) continue;
        itemsDisponibles.push({
          ordenId: o._id,
          ordenNumero: o.numero,
          itemId: it._id,
          referencia: it.referencia,
          cantidad: it.cantidad,
          producido: it.producido || 0,
          pendiente,
          fechaEntrega: o.fechaEntrega,
        });
      }
    }

    // Últimos registros del propio operario (para mostrar lo que ya hizo hoy)
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const misLogs = await ProductionLog.find({
      operario: req.user._id,
      horaInicio: { $gte: inicioDia },
    })
      .populate('referencia', 'sku nombre')
      .populate('orden', 'numero')
      .sort('-horaInicio')
      .lean({ virtuals: true });

    res.render('operario/index', {
      titulo: 'Mi producción',
      selladora,
      selladoras: [1, 2, 3, 4, 5],
      itemsDisponibles,
      misLogs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Registra un turno de producción.
 *
 * Reglas clave:
 *  - El operario indica selladora (1..5), número de rollo, horas, cantidad y desperdicio.
 *  - El item del pedido suma `producido`. Si alcanza la cantidad pedida → estado "completado".
 *  - Una misma referencia puede ser trabajada por varias selladoras en paralelo:
 *    no bloqueamos el item; cada log se acumula y, mientras `producido < cantidad`,
 *    el item sigue disponible para que otra selladora siga.
 */
exports.registrarTurno = async (req, res, next) => {
  try {
    const {
      selladora,
      ordenId,
      itemId,
      numeroRollo,
      horaInicio,
      horaFin,
      cantidadProducida,
      desperdicio,
      observaciones,
    } = req.body;

    const orden = await Order.findById(ordenId);
    if (!orden) {
      req.flash('error', 'Pedido no encontrado.');
      return res.redirect('/operario');
    }
    const item = orden.items.id(itemId);
    if (!item) {
      req.flash('error', 'Item de pedido no encontrado.');
      return res.redirect('/operario');
    }
    if (item.estado === 'completado' || item.estado === 'entregado') {
      req.flash('error', 'Esta referencia ya fue completada.');
      return res.redirect('/operario');
    }

    // Crear el log
    const log = await ProductionLog.create({
      operario: req.user._id,
      selladora: Number(selladora),
      orden: orden._id,
      orderItemId: item._id,
      referencia: item.referencia,
      numeroRollo,
      horaInicio: new Date(horaInicio),
      horaFin: new Date(horaFin),
      cantidadProducida: Number(cantidadProducida),
      desperdicio_kg: Number(desperdicio || 0),
      observaciones,
    });

    // Acumular en el item y verificar si se completó
    item.producido = (item.producido || 0) + Number(cantidadProducida);
    if (item.producido >= item.cantidad) {
      item.estado = 'completado';
      item.producido = item.cantidad; // tope
    }
    orden.recalcularEstadoGeneral();
    await orden.save();

    // Recordamos su selladora preferida
    if (req.user.selladoraDefault !== Number(selladora)) {
      req.user.selladoraDefault = Number(selladora);
      await req.user.save();
    }

    req.flash(
      'success',
      `Turno registrado · Selladora ${selladora} · Rollo ${numeroRollo} · ${cantidadProducida} unidades.`
    );
    res.redirect('/operario?selladora=' + selladora);
  } catch (err) {
    if (err.name === 'ValidationError') {
      req.flash('error', Object.values(err.errors).map(e => e.message).join(' · '));
      return res.redirect('/operario');
    }
    next(err);
  }
};
