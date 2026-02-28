const mongoose = require('mongoose');

const driverBaselineProfileSchema = new mongoose.Schema({
    driver_id: { type: String, required: true },
    driver_name: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    date: { type: Date, required: true },
    avg_driving_hours: { type: Number, default: 0 },
    avg_night_hours: { type: Number, default: 0 },
    avg_aggression_rate: { type: Number, default: 0 }, // 14-day rolling average
    aggression_volatility: { type: Number, default: 0 }, // Standard deviation of aggression over 14 days
    created_at: { type: Date, default: Date.now }
});

// Ensure uniqueness per driver per day baseline snapshot
driverBaselineProfileSchema.index({ driver_id: 1, date: 1 }, { unique: true });

const DriverBaselineProfile = mongoose.model('DriverBaselineProfile', driverBaselineProfileSchema);

module.exports = DriverBaselineProfile;
