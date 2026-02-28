const mongoose = require('mongoose');

const driverDailyMetricsSchema = new mongoose.Schema({
    driver_id: { type: String, required: true },
    driver_name: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    date: { type: Date, required: true },
    total_driving_hours: { type: Number, default: 0 },
    total_distance: { type: Number, default: 0 },
    night_driving_hours: { type: Number, default: 0 },
    harsh_brake_count: { type: Number, default: 0 },
    acceleration_count: { type: Number, default: 0 },
    speeding_count: { type: Number, default: 0 },
    aggression_rate: { type: Number, default: 0 },
    // Vehicle information
    vehicle_id: { type: String, default: '' },
    vehicle_name: { type: String, default: '' },
    vehicle_vin: { type: String, default: '' },
    vehicle_license_plate: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

// Ensure uniqueness per driver per day
driverDailyMetricsSchema.index({ driver_id: 1, date: 1 }, { unique: true });

const DriverDailyMetric = mongoose.model('DriverDailyMetric', driverDailyMetricsSchema);

module.exports = DriverDailyMetric;
