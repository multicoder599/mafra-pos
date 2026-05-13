const connectDB = require('./db');
const User = require('../models/User');

async function initMongo() {
    await connectDB();
    
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
        await User.create({
            username: 'admin',
            pin_hash: '1234', // In production, hash this!
            role: 'admin'
        });
        console.log('✅ Default Admin created! (Username: admin, PIN: 1234)');
    } else {
        console.log('⚡ Admin already exists.');
    }
    process.exit(0);
}

initMongo();