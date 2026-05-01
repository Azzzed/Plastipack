const mongoose = require('mongoose');

const ROLES = ['admin', 'jefe', 'vendedor', 'operario', 'pendiente'];

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    avatar: String,
    rol: { type: String, enum: ROLES, default: 'pendiente', index: true },
    // Para operarios: selladora habitualmente asignada (1..5). Opcional.
    selladoraDefault: { type: Number, min: 1, max: 5 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
