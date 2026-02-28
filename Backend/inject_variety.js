require('dotenv').config();
const connectDB = require('./db');
const DriverDailyMetric = require('./models/DriverDailyMetric');
const { calculateDriverDrift } = require('./services/driftService');

// ⚠️  WARNING: This script generates MOCK test data only!
// ⚠️  DO NOT run this with production Geotab data - it will overwrite real driver data
// ⚠️  Use aggregationEngine.js instead to fetch real data from Geotab API

async function injectRealisticMockData() {
    await connectDB();
    console.log("⚠️  INJECTING TEST DATA - This will overwrite existing driver data!");
    console.log("Generating mock data for existing drivers...");

    // Fetch the drivers we saved
    const driverIds = await DriverDailyMetric.distinct("driver_id");
    if (driverIds.length === 0) {
        console.log("No drivers found in DB. Run aggregationEngine.js first to fetch real data.");
        process.exit(1);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const dId of driverIds) {
        // Randomly assign a profile based on index
        const profileType = Math.floor(Math.random() * 4);
        // 0: Stable
        // 1: Mild Strain (Slightly increased driving)
        // 2: Moderate Strain (More night driving)
        // 3: High Strain (Spike in aggression & driving)

        // Generate mock vehicle data for this driver
        const vehicleNames = [
            'Fleet-001 Ford Transit',
            'Fleet-002 Mercedes Sprinter', 
            'Fleet-003 Freightliner Cascadia',
            'Fleet-004 Volvo VNL',
            'Fleet-005 Peterbilt 579',
            'Fleet-006 Kenworth T680',
            'Fleet-007 Mack Anthem',
            'Fleet-008 International LT',
            'Fleet-009 Isuzu NRR',
            'Fleet-010 RAM ProMaster'
        ];
        
        const vehicleName = vehicleNames[Math.floor(Math.random() * vehicleNames.length)];
        const vehicleId = `VEH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        console.log(`Generating 14 days for driver ${dId} (Profile ${profileType}) - Vehicle: ${vehicleName}...`);
        for (let i = 14; i >= 1; i--) {
            const date = new Date(today);
            date.setUTCDate(date.getUTCDate() - i);

            let drivingHours = 6 + Math.random() * 2; // Baseline 6-8 hrs
            let nightHours = Math.random() * 1; // Baseline 0-1 hrs
            let aggression = Math.random() * 2; // Baseline 0-2 incidents

            // Apply strain to the last 3 days
            if (i <= 3) {
                if (profileType === 1) { // Mild
                    drivingHours += 2;
                } else if (profileType === 2) { // Moderate
                    drivingHours += 3;
                    nightHours += 2;
                } else if (profileType === 3) { // High
                    drivingHours += 4;
                    nightHours += 3;
                    aggression += 10;
                }
            }

            await DriverDailyMetric.findOneAndUpdate({
                driver_id: dId,
                date: date
            }, {
                $set: {
                    driver_id: dId,
                    driver_name: dId, // Assuming ID is name from previous scrape
                    date: date,
                    total_driving_hours: Number(drivingHours.toFixed(2)),
                    total_distance: 100 + (drivingHours * 30),
                    night_driving_hours: Number(nightHours.toFixed(2)),
                    harsh_brake_count: Math.floor(aggression),
                    acceleration_count: Math.floor(aggression),
                    speeding_count: Math.floor(aggression * 2),
                    aggression_rate: Number(aggression.toFixed(2)),
                    // Vehicle information
                    vehicle_id: vehicleId,
                    vehicle_name: vehicleName,
                    vehicle_vin: `VIN${Math.random().toString(36).substr(2, 13).toUpperCase()}`,
                    vehicle_license_plate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9000) + 1000}`
                }
            }, { upsert: true, new: true });
        }

        // Generate drift for yesterday
        const yesterday = new Date(today);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        await calculateDriverDrift(dId, yesterday);
    }

    console.log("Done generating diverse profiles!");
    process.exit(0);
}

injectRealisticMockData();
