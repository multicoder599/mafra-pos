const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        // 👉 UPDATED: Added 'rooms' to support the new booking category
        enum: ['food', 'drinks', 'wines', 'rooms', 'eatery', 'drink'] 
    },
    price: { type: Number, required: true },
    buying_price: { type: Number, default: 0 }, // 👉 ADD THIS LINE
    stock: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);