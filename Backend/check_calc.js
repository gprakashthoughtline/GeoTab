require('./db')().then(async () => {
    const { calculateDriverDrift } = require('./services/driftService');
    const targetDate = new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);

    // Find any driver data that exists in the database
    const metrics = await require('./models/DriverDailyMetric').findOne({}).lean();
    if (metrics) {
        console.log("Checking driver ID: " + metrics.driver_id);
        console.log("Driver name: " + (metrics.driver_name || 'N/A'));
        const report = await calculateDriverDrift(metrics.driver_id, targetDate);
        if (report) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log("No drift report generated for this driver");
        }
    } else {
        console.log("No driver data found in database");
    }
    process.exit(0);
});
