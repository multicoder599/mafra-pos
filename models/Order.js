const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// In MongoDB, we can embed the order items directly inside the order!
const orderItemSchema = new mongoose.Schema({
    product_id: { type: String, ref: 'Product', required: true },
    name: { type: String }, // Storing name/price at time of order prevents historical receipt changes
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, required: true },
    kds_status: { type: String, enum: ['pending', 'preparing', 'ready', 'served'], default: 'pending' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    user_id: { type: String, ref: 'User' }, // The ID of the Admin/Cashier
    table_number: { type: String },
    items: [orderItemSchema], // Embedded array of items
    total_amount: { type: Number, default: 0 },
    
    // 👉 UPDATED: Status enum now matches your pending -> completed workflow
    status: { type: String, enum: ['pending', 'completed', 'voided'], default: 'pending' },
    
    // 👉 NEW: Added customer_name to track the Waiter who brought the order
    customer_name: { type: String, default: 'WALK-IN' },
    
    // 👉 NEW: Added served_by to track the Cashier who processed the receipt
    served_by: { type: String, default: 'Cashier' },
    
    sync_status: { type: String, enum: ['synced', 'pending_sync'], default: 'pending_sync' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);