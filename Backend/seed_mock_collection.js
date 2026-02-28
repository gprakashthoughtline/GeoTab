require('dotenv').config();
const connectDB = require('./db');
const DriverDailyMetric = require('./models/DriverDailyMetric');
const MockDriverDailyMetric = require('./models/MockDriverDailyMetric');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const seededNoise = (seed, dayIndex, salt = 0) => {
    const x = Math.sin(seed * 0.013 + dayIndex * 1.73 + salt * 2.11) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
};

const getDemoProfile = (seed) => {
    const profiles = [
        { drivingBase: 0.04, drivingRecent: 0.02, nightBase: 0.03, nightRecent: 0.02, aggressionBase: 0.06, aggressionRecent: 0.04 },
        { drivingBase: 0.10, drivingRecent: 0.14, nightBase: 0.12, nightRecent: 0.18, aggressionBase: 0.14, aggressionRecent: 0.22 },
        { drivingBase: 0.16, drivingRecent: 0.30, nightBase: 0.20, nightRecent: 0.34, aggressionBase: 0.24, aggressionRecent: 0.38 },
        { drivingBase: 0.24, drivingRecent: 0.46, nightBase: 0.30, nightRecent: 0.52, aggressionBase: 0.36, aggressionRecent: 0.62 }
    ];
    return profiles[seed % profiles.length];
};

const generateFourteenDayDemo = (seedRows, targetDate) => {
    const rowsByDriver = new Map();
    for (const row of seedRows) {
        if (!rowsByDriver.has(row.driver_id)) {
            rowsByDriver.set(row.driver_id, []);
        }
        rowsByDriver.get(row.driver_id).push(row);
    }

    const output = [];
    for (const [driverId, rows] of rowsByDriver.entries()) {
        const latest = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const seed = hashString(driverId || latest.driver_name || 'driver');
        const profile = getDemoProfile(seed);

        const baseDriving = latest.total_driving_hours > 0 ? latest.total_driving_hours : (6 + (seed % 5));
        const baseNight = latest.night_driving_hours > 0 ? latest.night_driving_hours : (1.2 + ((seed % 4) * 0.4));
        const baseDistance = latest.total_distance > 0 ? latest.total_distance : (baseDriving * (32 + (seed % 9)));
        const baseAggression = latest.aggression_rate > 0 ? latest.aggression_rate : (0.9 + ((seed % 6) * 0.35));

        for (let i = 0; i < 14; i++) {
            const date = new Date(targetDate);
            date.setUTCDate(targetDate.getUTCDate() - (13 - i));
            date.setUTCHours(0, 0, 0, 0);

            const progress = i / 13;
            const recentBoost = i >= 11 ? (i - 10) / 3 : 0;

            const drivingFactor = 1 + (profile.drivingBase * progress) + (profile.drivingRecent * recentBoost) + (seededNoise(seed, i, 1) * 0.05);
            const nightFactor = 1 + (profile.nightBase * progress) + (profile.nightRecent * recentBoost) + (seededNoise(seed, i, 2) * 0.06);
            const aggressionFactor = 1 + (profile.aggressionBase * progress) + (profile.aggressionRecent * recentBoost) + (seededNoise(seed, i, 3) * 0.08);

            const totalDrivingHours = Number(clamp(baseDriving * drivingFactor, 2.5, 15).toFixed(2));
            const nightDrivingHours = Number(clamp(baseNight * nightFactor, 0.2, totalDrivingHours * 0.8).toFixed(2));
            const totalDistance = Number(clamp(baseDistance * (0.92 + progress * 0.16 + seededNoise(seed, i, 4) * 0.05), 55, 620).toFixed(2));
            const aggressionRate = Number(clamp(baseAggression * aggressionFactor, 0.4, 9.5).toFixed(2));

            const eventCount = Math.max(1, Math.round((aggressionRate * totalDistance) / 100));
            const harshBrakeCount = Math.max(0, Math.round(eventCount * (0.30 + seededNoise(seed, i, 5) * 0.08)));
            const accelerationCount = Math.max(0, Math.round(eventCount * (0.33 + seededNoise(seed, i, 6) * 0.08)));
            const speedingCount = Math.max(0, eventCount - harshBrakeCount - accelerationCount);

            output.push({
                driver_id: driverId,
                driver_name: latest.driver_name || driverId,
                first_name: latest.first_name || '',
                last_name: latest.last_name || '',
                date,
                total_driving_hours: totalDrivingHours,
                total_distance: totalDistance,
                night_driving_hours: nightDrivingHours,
                harsh_brake_count: harshBrakeCount,
                acceleration_count: accelerationCount,
                speeding_count: speedingCount,
                aggression_rate: aggressionRate,
                vehicle_id: latest.vehicle_id || `demo-${String(seed % 97).padStart(2, '0')}`,
                vehicle_name: latest.vehicle_name || `Demo - ${String(seed % 97).padStart(2, '0')}`,
                vehicle_vin: latest.vehicle_vin || '',
                vehicle_license_plate: latest.vehicle_license_plate || ''
            });
        }
    }

    return output;
};

async function seedMockCollection() {
    await connectDB();

    const latestDates = await DriverDailyMetric.distinct('date');
    if (!latestDates.length) {
        console.log('No source data found in DriverDailyMetric.');
        process.exit(0);
    }

    const sortedDates = latestDates
        .map((date) => new Date(date))
        .sort((a, b) => b - a)
        .slice(0, 2);

    const fromDate = sortedDates[sortedDates.length - 1];
    const toDate = sortedDates[0];

    const sourceRows = await DriverDailyMetric.find({
        date: { $gte: fromDate, $lte: toDate }
    }).lean();

    if (!sourceRows.length) {
        console.log('No rows found in the selected 2-day range.');
        process.exit(0);
    }

    const targetDate = new Date(toDate);
    targetDate.setUTCHours(0, 0, 0, 0);
    const generatedRows = generateFourteenDayDemo(sourceRows, targetDate);

    await MockDriverDailyMetric.deleteMany({});
    await MockDriverDailyMetric.insertMany(generatedRows);

    console.log(`Mock collection seeded with ${generatedRows.length} generated rows (14 days per driver, varied patterns).`);
    process.exit(0);
}

seedMockCollection().catch((error) => {
    console.error('Failed to seed mock collection:', error.message);
    process.exit(1);
});
