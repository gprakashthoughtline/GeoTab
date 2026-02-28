require('dotenv').config();
const connectDB = require('./db');
const DriverDailyMetric = require('./models/DriverDailyMetric');

async function run() {
    await connectDB();
    const metrics = await DriverDailyMetric.find({}).lean();
    console.log("Found " + metrics.length + " driver metrics records");

    // Group by driver to see what data exists  
    const byDriver = {};
    for (const m of metrics) {
        const driverKey = m.driver_name || m.driver_id || 'Unknown';
        if (!byDriver[driverKey]) byDriver[driverKey] = [];
        byDriver[driverKey].push(m);
    }

    console.log(`\nData for ${Object.keys(byDriver).length} drivers:\n`);
    for (const dname of Object.keys(byDriver)) {
        console.log(`Driver: ${dname} (${byDriver[dname].length} records)`);
        // Show latest 3 records for each driver
        const recent = byDriver[dname].slice(-3);
        for (const m of recent) {
            console.log(`  ${m.date.toISOString().split('T')[0]}: ${m.total_driving_hours}h driving, ${m.night_driving_hours}h night, ${m.aggression_rate} aggr/100km, ${m.total_distance}km`);
        }
        console.log('');
    }

    process.exit(0);
}

run();
