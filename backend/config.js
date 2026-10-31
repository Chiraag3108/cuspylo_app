module.exports = {
  port: Number(process.env.PORT) || 3000,

  secret: process.env.SECRET,

  admin: {
    id: process.env.ADMIN_ID,
    password: process.env.ADMIN_PASS
  },

  whatsapp: process.env.WHATSAPP_NUMBER || '',
  email: process.env.CONTACT_EMAIL || '',

  slots: [
    { from: 9, to: 12, price: 49 },
    { from: 12, to: 15, price: 50 }
  ],

  defaultPrice: 52
};