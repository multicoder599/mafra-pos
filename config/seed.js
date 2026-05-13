const connectDB = require('./db');
    const Product = require('../models/Product');
    const User = require('../models/User');

    async function seedDatabase() {
        await connectDB();

        // 1. Ensure admin exists
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({ username: 'admin', pin_hash: '1234', role: 'admin' });
            console.log('✅ Admin user created');
        }

        // 2. Clear old products and add new ones
        await Product.deleteMany({});
        await Product.insertMany([
            { name: 'Tusker Lager', category: 'Beer', type: 'drink', price: 250, stock_quantity: 100 },
            { name: 'White Cap', category: 'Beer', type: 'drink', price: 250, stock_quantity: 100 },
            { name: 'Savanna Dry', category: 'Cider', type: 'drink', price: 300, stock_quantity: 50 },
            { name: 'Grilled Tilapia & Ugali', category: 'Main', type: 'eatery', price: 800 },
            { name: 'Nyama Choma (1kg)', category: 'Grill', type: 'eatery', price: 1200 },
            { name: 'Samosa (Beef)', category: 'Snacks', type: 'eatery', price: 150 }
        ]);
        
        console.log('🍔 Products seeded successfully!');
        process.exit(0);
    }

    seedDatabase();
    