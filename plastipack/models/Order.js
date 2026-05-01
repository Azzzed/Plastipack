const mongoose = require('mongoose');

const ESTADOS_ITEM = ['en_espera', 'en_produccion', 'completado', 'entregado'];
const ESTADOS_ORDEN = ['en_espera', 'en_produccion', 'parcial', 'completado', 'entregado'];

/**
 * Cada item del pedido (una referencia + cantidad) lleva su propio estado.
 * Esto permite que un pedido con 4 referencias tenga 3 "en producción"
 * y 1 "en espera" cuando no hay stock de materia prima.
 */
const orderItemSchema = new mongoose.Schema(
  {
    referencia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reference',
      required: true,
    },
    cantidad: { type: Number, required: true, min: 1 },
    valorUnitario: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS_ITEM, default: 'en_espera', index: true },
    // Cantidad realmente producida (suma de todos los logs ligados a este item)
    producido: { type: Number, default: 0, min: 0 },
    notas: String,
  },
  { _id: true, timestamps: true }
);

orderItemSchema.virtual('subtotal').get(function () {
  return this.cantidad * this.valorUnitario;
});

const orderSchema = new mongoose.Schema(
  {
    numero: { type: String, unique: true, index: true }, // Generado en pre-save
    vendedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cliente: {
      nombre: { type: String, required: true, trim: true },
      contacto: String, // teléfono o correo
    },
    destino: { type: String, enum: ['interno', 'externo'], required: true },
    items: {
      type: [orderItemSchema],
      validate: [arr => arr.length > 0, 'El pedido debe tener al menos una referencia'],
    },
    fechaEntrega: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          // mínimo 15 días después de la creación
          const base = this.createdAt || new Date();
          const minimo = new Date(base);
          minimo.setDate(minimo.getDate() + 15);
          // Tolerancia de un minuto para evitar problemas de zona horaria
          return v.getTime() >= minimo.getTime() - 60_000;
        },
        message: 'La fecha de entrega debe ser al menos 15 días después de la creación del pedido.',
      },
    },
    estadoGeneral: { type: String, enum: ESTADOS_ORDEN, default: 'en_espera', index: true },
    notas: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

orderSchema.virtual('total').get(function () {
  return this.items.reduce((acc, it) => acc + it.cantidad * it.valorUnitario, 0);
});

/**
 * Recalcula el estado general del pedido a partir de los estados individuales
 * de sus items. Sigue la regla: refleja el conjunto de estados de las refs.
 */
orderSchema.methods.recalcularEstadoGeneral = function () {
  const estados = this.items.map(i => i.estado);
  if (estados.every(e => e === 'entregado')) this.estadoGeneral = 'entregado';
  else if (estados.every(e => e === 'completado' || e === 'entregado')) this.estadoGeneral = 'completado';
  else if (estados.every(e => e === 'en_espera')) this.estadoGeneral = 'en_espera';
  else if (estados.every(e => e === 'en_produccion')) this.estadoGeneral = 'en_produccion';
  else this.estadoGeneral = 'parcial';
};

// Genera un número legible: ORD-YYMM-XXXX
orderSchema.pre('save', async function (next) {
  if (!this.numero) {
    const d = new Date();
    const yymm = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: new Date(d.getFullYear(), d.getMonth(), 1),
        $lt: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      },
    });
    this.numero = `ORD-${yymm}-${String(count + 1).padStart(4, '0')}`;
  }
  this.recalcularEstadoGeneral();
  next();
});

orderSchema.statics.ESTADOS_ITEM = ESTADOS_ITEM;
orderSchema.statics.ESTADOS_ORDEN = ESTADOS_ORDEN;

module.exports = mongoose.model('Order', orderSchema);
