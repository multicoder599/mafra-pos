const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    // 👉 FIXED: Changed from ObjectId to String so it accepts any ID format!
    user_id: { 
        type: String, 
        required: true 
    },
    clock_in: { 
        type: Date, 
        default: Date.now 
    },
    clock_out: { 
        type: Date 
    },
    status: { 
        type: String, 
        enum: ['clocked_in', 'clocked_out'], 
        default: 'clocked_in' 
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);