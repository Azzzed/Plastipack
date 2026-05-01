const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI no está definido en .env');

    await mongoose.connect(uri);
    console.log('✅  MongoDB conectado:', mongoose.connection.host);
  } catch (err) {
    console.error('❌  Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
