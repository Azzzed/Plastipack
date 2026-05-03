const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'jefe', 'vendedor', 'operario', 'pendiente'];
const PROVIDERS = ['local', 'google'];

const userSchema = new mongoose.Schema(
  {
    // Identidad
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    nombre: { type: String, required: true, trim: true },
    avatar: String,

    // Autenticación
    authProvider: { type: String, enum: PROVIDERS, default: 'local' },
    googleId: { type: String, sparse: true, index: true }, // solo si auth con Google
    passwordHash: { type: String, select: false },          // solo si auth local

    // Autorización
    rol: { type: String, enum: ROLES, default: 'pendiente', index: true },
    selladoraDefault: { type: Number, min: 1, max: 5 }, // operario: selladora habitual
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Hashea y guarda la contraseña en texto plano */
userSchema.methods.setPassword = async function (plain) {
  if (!plain || plain.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  this.passwordHash = await bcrypt.hash(plain, 10);
};

/** Compara una contraseña en plano contra el hash guardado */
userSchema.methods.checkPassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.ROLES = ROLES;
userSchema.statics.PROVIDERS = PROVIDERS;

module.exports = mongoose.model('User', userSchema);
