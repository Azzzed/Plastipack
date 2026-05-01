const ProductionLog = require('../models/ProductionLog');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Reporte de producción agregado por selladora y por operario.
 * Acepta filtro por rango de fechas (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD).
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

/**
 * Vista del jefe con todas las órdenes activas.
 */
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

/**
 * Panel admin para asignar roles a usuarios "pendiente".
 */
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
