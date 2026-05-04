const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const Order = require('../models/Order');
const Reference = require('../models/Reference');
const ProductionLog = require('../models/ProductionLog');
const User = require('../models/User');

router.get('/', ensureAuth, ensureRoleAssigned, (req, res) => {
  switch (req.user.rol) {
    case 'operario':  return res.redirect('/operario');
    case 'vendedor':  return res.redirect('/pedidos');
    case 'jefe':
    case 'admin':     return res.redirect('/dashboard');
    default:          return res.redirect('/sin-rol');
  }
});

router.get(
  '/dashboard',
  ensureAuth,
  ensureRoleAssigned,
  requireRole('jefe'),          // admin siempre pasa por requireRole
  async (req, res, next) => {
    try {
      const [ordenesActivas, totalReferencias, totalOperarios, pendientes] = await Promise.all([
        Order.countDocuments({ estadoGeneral: { $nin: ['entregado'] } }),
        Reference.countDocuments({ activo: true }),
        User.countDocuments({ rol: 'operario' }),
        User.countDocuments({ rol: 'pendiente' }),
      ]);

      // Producción de hoy
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const prodHoyAgg = await ProductionLog.aggregate([
        { $match: { horaInicio: { $gte: inicioDia } } },
        { $group: { _id: null, total: { $sum: '$cantidadProducida' } } },
      ]);
      const produccionHoy = prodHoyAgg[0]?.total || 0;

      // Órdenes urgentes (próximos 7 días, no entregadas)
      const en7dias = new Date();
      en7dias.setDate(en7dias.getDate() + 7);
      const ordenesUrgentes = await Order.find({
        estadoGeneral: { $nin: ['entregado'] },
        fechaEntrega: { $lte: en7dias },
      })
        .populate('items.referencia', 'sku nombre')
        .sort('fechaEntrega')
        .limit(8)
        .lean({ virtuals: true });

      // Últimos logs del día
      const ultimosLogs = await ProductionLog.find({ horaInicio: { $gte: inicioDia } })
        .populate('operario', 'nombre')
        .populate('referencia', 'sku nombre')
        .sort('-horaInicio')
        .limit(8)
        .lean({ virtuals: true });

      res.render('dashboard', {
        titulo: 'Panel principal',
        stats: { ordenesActivas, totalReferencias, produccionHoy, totalOperarios, pendientes },
        ordenesUrgentes,
        ultimosLogs,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
