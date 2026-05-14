const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    
    // 👉 UPDATED: The strict 'enum' list has been completely removed.
    // Now it will accept any category string you send from the frontend!
    type: { 
        type: String, 
        required: true 
    },
    
    price: { type: Number, required: true },
    buying_price: { type: Number, default: 0 }, 
    stock: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);