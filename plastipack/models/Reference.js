const mongoose = require('mongoose');

const TIPOS = ['bolsa', 'rollo', 'lamina'];
const DESTINOS = ['interno', 'externo'];

const referenceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'El SKU es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, enum: TIPOS, required: true, index: true },

    materiaPrima: { type: String, required: true, trim: true },

    // Dimensiones — campos opcionales según el tipo de producto
    dimensiones: {
      ancho_cm: Number,    // bolsa, lámina
      alto_cm: Number,     // bolsa
      largo_m: Number,     // rollo, lámina
      calibre_mic: Number, // micras / espesor
      fuelle_cm: Number,   // bolsa con fuelle
    },

    impresion: {
      lleva: { type: Boolean, default: false },
      logo: String,         // referencia/descripción del arte
      colores: { type: Number, min: 0, max: 8, default: 0 },
    },

    destino: { type: String, enum: DESTINOS, required: true, index: true },

    // Procesos requeridos (extrusión es siempre obligatorio).
    procesos: {
      extrusion: { type: Boolean, default: true },
      impresionRefilado: { type: Boolean, default: false },
      sellado: { type: Boolean, default: true },
    },

    pesoUnitario_g: Number,
    notas: String,

    activo: { type: Boolean, default: true, index: true },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Índice de texto para búsquedas rápidas en el formulario de pedido
referenceSchema.index({ sku: 'text', nombre: 'text', materiaPrima: 'text' });

referenceSchema.statics.TIPOS = TIPOS;
referenceSchema.statics.DESTINOS = DESTINOS;

module.exports = mongoose.model('Reference', referenceSchema);
