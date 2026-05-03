const ProductionLog = require('../models/ProductionLog');
const Order = require('../models/Order');
const User = require('../models/User');
const Reference = require('../models/Reference');

/**
 * Dashboard stats for jefe/admin home screen.
 */
exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalReferencias,
      totalOperarios,
      ordenesActivas,
      produccionHoy,
    ] = await Promise.all([
      Reference.countDocuments({ activo: true }),
      User.countDocuments({ rol: 'operario' }),
      Order.find({ estadoGeneral: { $ne: 'entregado' } })
        .populate('vendedor', 'nombre')
        .populate('items.referencia', 'sku nombre')
        .sort('fechaEntrega')
        .limit(5)
        .lean({ virtuals: true }),
      (() => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        return ProductionLog.aggregate([
          { $match: { horaInicio: { $gte: hoy } } },
          { $group: { _id: null, producido: { $sum: '$cantidadProducida' }, turnos: { $sum: 1 } } },
        ]);
      })(),
    ]);

    // Ordenes por estado
    const estadosOrdenes = await Order.aggregate([
      { $group: { _id: '$estadoGeneral', count: { $sum: 1 } } },
    ]);
    const estatMap = Object.fromEntries(estadosOrdenes.map(e => [e._id, e.count]));

    // Producción últimos 7 días por día
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6); hace7.setHours(0,0,0,0);
    const prodSemanal = await ProductionLog.aggregate([
      { $match: { horaInicio: { $gte: hace7 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$horaInicio' } },
          producido: { $sum: '$cantidadProducida' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Usuarios pendientes de rol
    const pendientes = await User.countDocuments({ rol: 'pendiente' });

    const prodHoyData = produccionHoy[0] || { producido: 0, turnos: 0 };

    res.render('dashboard', {
      titulo: 'Panel principal',
      stats: {
        referencias: totalReferencias,
        operarios: totalOperarios,
        ordenesActivas: ordenesActivas.length,
        producidoHoy: prodHoyData.producido,
        turnosHoy: prodHoyData.turnos,
        pendientes,
        enEspera: estatMap['en_espera'] || 0,
        enProduccion: estatMap['en_produccion'] || 0,
        completados: estatMap['completado'] || 0,
      },
      ordenesRecientes: ordenesActivas,
      prodSemanal,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reporte de producción agregado por selladora y por operario.
 */
exports.reporteProduccion = async (req, res, next) => {
  try {
    const desde = req.query.desde
      ? new Date(req.query.desde)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const hasta = req.query.hasta
      ? new Date(req.query.hasta + 'T23:59:59')
      : new Date();

    const matchPeriodo = { horaInicio: { $gte: desde, $lte: hasta } };

    const porSelladora = await ProductionLog.aggregate([
      { $match: matchPeriodo },
      {
        $group: {
          _id: '$selladora',
          turnos: { $sum: 1 },
          producido: { $sum: '$cantidadProducida' },
          desperdicio: { $sum: '$desperdicio_kg' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const porOperario = await ProductionLog.aggregate([
      { $match: matchPeriodo },
      {
        $group: {
          _id: '$operario',
          turnos: { $sum: 1 },
          producido: { $sum: '$cantidadProducida' },
          desperdicio: { $sum: '$desperdicio_kg' },
        },
      },
      { $sort: { producido: -1 } },
    ]);

    const operariosIds = porOperario.map(o => o._id);
    const operarios = await User.find({ _id: { $in: operariosIds } })
      .select('nombre email')
      .lean();
    const mapa = Object.fromEntries(operarios.map(u => [u._id.toString(), u]));
    const filasOperarios = porOperario.map(p => ({
      ...p,
      nombre: mapa[p._id.toString()]?.nombre || 'Desconocido',
      email: mapa[p._id.toString()]?.email || '',
    }));

    const totales = porSelladora.reduce(
      (acc, r) => ({
        turnos: acc.turnos + r.turnos,
        producido: acc.producido + r.producido,
        desperdicio: acc.desperdicio + r.desperdicio,
      }),
      { turnos: 0, producido: 0, desperdicio: 0 }
    );

    const ultimosLogs = await ProductionLog.find(matchPeriodo)
      .populate('operario', 'nombre')
      .populate('referencia', 'sku nombre')
      .populate('orden', 'numero')
      .sort('-horaInicio')
      .limit(30)
      .lean({ virtuals: true });

    res.render('jefe/reportes', {
      titulo: 'Reportes de producción',
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0],
      porSelladora,
      filasOperarios,
      totales,
      ultimosLogs,
    });
  } catch (err) {
    next(err);
  }
};

exports.ordenesActivas = async (req, res, next) => {
  try {
    const ordenes = await Order.find({ estadoGeneral: { $ne: 'entregado' } })
      .populate('vendedor', 'nombre')
      .populate('items.referencia', 'sku nombre')
      .sort('fechaEntrega')
      .lean({ virtuals: true });
    res.render('jefe/ordenes/index', { titulo: 'Órdenes activas', ordenes });
  } catch (err) {
    next(err);
  }
};

exports.usuariosPendientes = async (req, res, next) => {
  try {
    const pendientes = await User.find({ rol: 'pendiente' }).sort('-createdAt').lean();
    const todos = await User.find({}).sort('rol nombre').lean();
    res.render('jefe/usuarios', {
      titulo: 'Gestión de usuarios',
      pendientes,
      todos,
      roles: ['admin', 'jefe', 'vendedor', 'operario'],
    });
  } catch (err) {
    next(err);
  }
};

exports.asignarRol = async (req, res, next) => {
  try {
    const { rol } = req.body;
    if (!['admin', 'jefe', 'vendedor', 'operario'].includes(rol)) {
      req.flash('error', 'Rol inválido.');
      return res.redirect('/admin/usuarios');
    }
    await User.findByIdAndUpdate(req.params.id, { rol });
    req.flash('success', 'Rol actualizado.');
    res.redirect('/admin/usuarios');
  } catch (err) {
    next(err);
  }
};
