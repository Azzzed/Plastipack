const mongoose = require('mongoose');

/**
 * Cada log es UN turno de UN operario en UNA selladora trabajando UN item de pedido.
 *
 * Como una misma referencia puede repartirse entre varias selladoras (regla #8 del PDF),
 * un mismo OrderItem puede tener N logs con diferentes selladoras y diferentes operarios
 * trabajando en paralelo. La cantidad total producida del item es la suma de los logs.
 */
const productionLogSchema = new mongoose.Schema(
  {
    operario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    selladora: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    // Vínculo con el pedido y el item específico que se está produciendo
    orden: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderItemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    referencia: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },

    numeroRollo: { type: String, required: true, trim: true, index: true },
    horaInicio: { type: Date, required: true },
    horaFin: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return !this.horaInicio || v.getTime() > this.horaInicio.getTime();
        },
        message: 'La hora de fin debe ser posterior a la hora de inicio.',
      },
    },

    cantidadProducida: { type: Number, required: true, min: 0 },
    desperdicio_kg: { type: Number, required: true, min: 0, default: 0 },

    observaciones: String,
  },
  { timestamps: true }
);

// Para reportes por turno / por selladora / por operario
productionLogSchema.index({ selladora: 1, horaInicio: -1 });
productionLogSchema.index({ operario: 1, horaInicio: -1 });

productionLogSchema.virtual('duracionMin').get(function () {
  if (!this.horaInicio || !this.horaFin) return 0;
  return Math.round((this.horaFin - this.horaInicio) / 60000);
});

productionLogSchema.set('toJSON', { virtuals: true });
productionLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProductionLog', productionLogSchema);
