const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// --- DATABASE MODELS ---
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Attendance = require('./models/Attendance'); 

// 1. Connect to Database
connectDB();

// ==========================================
// 2. CENTRAL API & WEBSOCKET SERVER (PORT 5000)
// ==========================================
const apiApp = express();
const apiServer = http.createServer(apiApp);
const io = new Server(apiServer, { cors: { origin: '*' } }); 

// Middleware
apiApp.use(cors()); 
apiApp.use(express.json());

// ==========================================
// --- API ROUTES ---
// ==========================================

// ------------------------------------------
// AUTHENTICATION
// ------------------------------------------
apiApp.post('/api/login', async (req, res) => {
    const { username, pin, attemptedRole } = req.body;
    try {
        const user = await User.findOne({ username, pin_hash: pin });
        
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        // Block login if the account is suspended/on leave
        if (user.isActive === false && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Account suspended or on leave. Contact Admin.' });
        }

        if (user.role === attemptedRole || user.role === 'admin') {
            res.json({ success: true, token: 'temp-auth-token', role: user.role });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials or wrong portal' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ------------------------------------------
// STAFF MANAGEMENT
// ------------------------------------------
apiApp.get('/api/staff', async (req, res) => {
    try {
        const staff = await User.find({}, '-pin_hash').sort({ createdAt: -1 }); 
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch staff' });
    }
});

apiApp.post('/api/staff', async (req, res) => {
    try {
        const { username, role, pin } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, message: 'Username already exists' });

        const newUser = await User.create({ username, role, pin_hash: pin });
        res.json({ success: true, message: 'Staff added successfully!', user: newUser });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add staff' });
    }
});

// Edit Username and Active Status (Suspend/Leave)
apiApp.patch('/api/staff/:id/edit', async (req, res) => {
    try {
        const { username, isActive } = req.body;
        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to update: ${error.message}` });
    }
});

apiApp.patch('/api/staff/:id/password', async (req, res) => {
    try {
        const { newPin } = req.body;
        await User.findByIdAndUpdate(req.params.id, { pin_hash: newPin });
        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

apiApp.delete('/api/staff/:id', async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (userToDelete && userToDelete.username === 'admin') {
            return res.status(400).json({ success: false, message: 'Cannot delete the main admin account!' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Staff deleted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete staff' });
    }
});

// ------------------------------------------
// STAFF ATTENDANCE
// ------------------------------------------
apiApp.get('/api/attendance', async (req, res) => {
    try {
        const records = await Attendance.find({}).sort({ clock_in: -1 });
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
});

apiApp.post('/api/attendance', async (req, res) => {
    try {
        const { username, action } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const userIdString = String(user._id);

        if (action === 'in') {
            // Check if they are already clocked in to prevent double-punches
            const alreadyIn = await Attendance.findOne({ user_id: userIdString, status: 'clocked_in' });
            if (alreadyIn) return res.status(400).json({ success: false, message: 'Already clocked in' });

            await Attendance.create({ user_id: userIdString, status: 'clocked_in' });
            res.json({ success: true, message: 'Clocked In Successfully' });
        } else if (action === 'out') {
            // 👉 CRITICAL: Find ONLY the open record for THIS specific user
            const record = await Attendance.findOneAndUpdate(
                { user_id: userIdString, status: 'clocked_in' }, // Must match this user
                { clock_out: Date.now(), status: 'clocked_out' },
                { sort: { clock_in: -1 }, new: true }
            );

            if (!record) return res.status(400).json({ success: false, message: 'No active clock-in found for this user' });
            
            res.json({ success: true, message: 'Clocked Out Successfully' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
});

// ------------------------------------------
// PRODUCTS & INVENTORY
// ------------------------------------------
apiApp.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
});

apiApp.post('/api/products', async (req, res) => {
    try {
        const { name, type, price, stock } = req.body;
        const newProduct = await Product.create({
            name,
            type: type.toLowerCase(),
            price: Number(price),
            stock: Number(stock) || 0
        });
        res.json({ success: true, message: 'Product created!', product: newProduct });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
    }
});

apiApp.patch('/api/products/:id', async (req, res) => {
    try {
        const { price, addedStock } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (price !== undefined && price !== '') product.price = Number(price);
        if (addedStock !== undefined && addedStock !== '') {
            product.stock = (product.stock || 0) + Number(addedStock);
        }

        await product.save();
        res.json({ success: true, message: 'Inventory updated', product });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to update inventory: ${error.message}` });
    }
});

apiApp.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted!' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
    }
});

// WIPE ROUTE: Products
apiApp.get('/api/products/wipe-test-data', async (req, res) => {
    try {
        await Product.deleteMany({});
        res.json({ success: true, message: 'All products and ghosts wiped permanently!' });
    } catch (error) {
        console.error('Error wiping products:', error);
        res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
    }
});

// ------------------------------------------
// ORDERS & AUTO-STOCK REDUCTION
// ------------------------------------------
apiApp.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
});

// 👉 UPDATED: Auto-Stock Deduction and Customer Name capturing!
apiApp.post('/api/orders', async (req, res) => {
    try {
        const { items, total_amount, table_number, served_by, customer_name } = req.body;
        const adminUser = await User.findOne({ username: 'admin' }); 

        // 1. Create the order with 'pending' status
        const newOrder = await Order.create({
            user_id: adminUser ? adminUser._id : null,
            table_number: table_number || 'Walk-in',
            items: items,
            total_amount: total_amount,
            status: 'pending', // Order starts as Pending
            served_by: served_by || 'Cashier',
            customer_name: customer_name || 'WALK-IN' // Save the Waiter/Customer name
        });

        // 2. AUTO-REDUCE STOCK in the database
        if (items && items.length > 0) {
            for (let item of items) {
                if (item.product_id) {
                    await Product.findByIdAndUpdate(item.product_id, {
                        $inc: { stock: -item.quantity } // Dynamically subtract the quantity bought
                    });
                }
            }
        }

        res.json({ success: true, order: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to save order: ${error.message}` });
    }
});

apiApp.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

// WIPE ROUTE: Orders
apiApp.get('/api/orders/wipe-test-data', async (req, res) => {
    try {
        await Order.deleteMany({});
        res.json({ success: true, message: 'All test orders deleted permanently!' });
    } catch (error) {
        console.error('Error wiping orders:', error);
        res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
    }
});

// ==========================================
// --- WEBSOCKETS ---
// ==========================================
io.on('connection', (socket) => {
    console.log(`🟢 Device connected to central API: ${socket.id}`);

    socket.on('send_order_to_kitchen', (orderData) => {
        io.emit('receive_kitchen_order', orderData); 
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Device disconnected: ${socket.id}`);
    });
});

// Start the Central API
const API_PORT = process.env.PORT || 5000;
apiServer.listen(API_PORT, () => {
    console.log(`🟢 Central API running on http://localhost:${API_PORT}`);
});

// ==========================================
// 3. ISOLATED FRONTEND SERVERS
// ==========================================
function createFrontendServer(folderName, port, displayName) {
    const app = express();
    app.use(express.static(path.join(__dirname, `public/${folderName}`)));
    
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, `public/${folderName}/index.html`));
    });

    app.listen(port, () => {
        console.log(`🔵 ${displayName} Portal running on http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`⚠️ Port ${port} is already in use by a zombie process. You must kill it first.`);
        } else {
            console.error(`Error starting ${displayName} server:`, err);
        }
    });
}

createFrontendServer('admin', 5001, 'Admin');
createFrontendServer('cashier', 5002, 'Cashier');
createFrontendServer('staff', 5004, 'Waitstaff');