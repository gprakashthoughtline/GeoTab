require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const DriverDailyMetric = require('./models/DriverDailyMetric');
const DriverBaselineProfile = require('./models/DriverBaselineProfile');
const MockDriverDailyMetric = require('./models/MockDriverDailyMetric');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running' });
});

const { calculateDriverDrift } = require('./services/driftService');
const { startScheduler, triggerManualRefresh } = require('./services/scheduler');

const average = (values) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDev = (values, mean) => {
    if (!values.length) return 0;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
};

const calcDrift = (recent, baseline) => {
    if (baseline === 0) return recent > 0 ? 100 : 0;
    return ((recent - baseline) / baseline) * 100;
};

const countConsecutiveStrainDays = (metricsDesc, baseline) => {
    let consecutive = 0;
    for (const metric of metricsDesc.slice(0, 7)) {
        const drivingDrift = calcDrift(metric.total_driving_hours || 0, baseline.avgDrivingHours);
        const nightDrift = calcDrift(metric.night_driving_hours || 0, baseline.avgNightHours);
        const aggressionDrift = calcDrift(metric.aggression_rate || 0, baseline.avgAggressionRate);
        const strain = drivingDrift > 25 && nightDrift > 20 && aggressionDrift > 20;
        if (!strain) break;
        consecutive += 1;
    }
    return consecutive;
};

const getRiskLevel = (score) => {
    if (score >= 50) return { backend: 'High Strain', frontend: 'high' };
    if (score >= 30) return { backend: 'Moderate Strain', frontend: 'moderate' };
    if (score >= 15) return { backend: 'Mild Strain', frontend: 'mild' };
    return { backend: 'Stable', frontend: 'stable' };
};

const buildMockNudge = (firstName, riskLabel, drift) => {
    const hours = Math.round(drift.drivingHoursDrift || 0);
    const night = Math.round(drift.nightHoursDrift || 0);
    const aggression = Math.round(drift.aggressionDrift || 0);

    if (riskLabel === 'high') {
        return `Hi ${firstName}, we noticed sustained strain in your recent pattern (hours +${hours}%, night +${night}%, aggression +${aggression}%). Please take a recovery break and connect with your manager today.`;
    }
    if (riskLabel === 'moderate') {
        return `Hi ${firstName}, your recent workload trend is elevated (hours +${hours}%, night +${night}%). Please plan rest time and reduce late shifts where possible.`;
    }
    if (riskLabel === 'mild') {
        return `Hi ${firstName}, small drift detected in your recent driving behavior. Keep a steady pace, hydrate, and take short breaks during long routes.`;
    }
    return `Hi ${firstName}, thank you for maintaining a stable and safe driving pattern this week.`;
};

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
    return (x - Math.floor(x)) * 2 - 1; // -1 to +1
};

const getDemoRoute = (seed) => {
    const routes = [
        'City Core Route',
        'Industrial Belt',
        'Airport Shuttle',
        'Long Haul North',
        'Metro Connector',
        'Coastal Line'
    ];
    return routes[seed % routes.length];
};

const getDemoProfile = (seed) => {
    const profiles = [
        { key: 'stable', drivingBase: 0.04, drivingRecent: 0.02, nightBase: 0.03, nightRecent: 0.02, aggressionBase: 0.06, aggressionRecent: 0.04 },
        { key: 'mild', drivingBase: 0.10, drivingRecent: 0.14, nightBase: 0.12, nightRecent: 0.18, aggressionBase: 0.14, aggressionRecent: 0.22 },
        { key: 'moderate', drivingBase: 0.16, drivingRecent: 0.30, nightBase: 0.20, nightRecent: 0.34, aggressionBase: 0.24, aggressionRecent: 0.38 },
        { key: 'high', drivingBase: 0.24, drivingRecent: 0.46, nightBase: 0.30, nightRecent: 0.52, aggressionBase: 0.36, aggressionRecent: 0.62 }
    ];
    return profiles[seed % profiles.length];
};

const generateDemoMetricsFromSeeds = (seedMetrics, targetDate) => {
    const metricsByDriver = new Map();
    for (const metric of seedMetrics) {
        if (!metricsByDriver.has(metric.driver_id)) {
            metricsByDriver.set(metric.driver_id, []);
        }
        metricsByDriver.get(metric.driver_id).push(metric);
    }

    const syntheticMetrics = [];
    for (const [driverId, driverMetrics] of metricsByDriver.entries()) {
        const latest = [...driverMetrics].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const seed = hashString(driverId || latest.driver_name || 'driver');
        const profile = getDemoProfile(seed);

        const baseDriving = latest.total_driving_hours > 0 ? latest.total_driving_hours : (6 + (seed % 5));
        const baseNight = latest.night_driving_hours > 0 ? latest.night_driving_hours : (1.2 + ((seed % 4) * 0.4));
        const baseDistance = latest.total_distance > 0 ? latest.total_distance : (baseDriving * (32 + (seed % 9)));
        const baseAggression = latest.aggression_rate > 0 ? latest.aggression_rate : (0.9 + ((seed % 6) * 0.35));

        for (let i = 0; i < 14; i++) {
            const dayDate = new Date(targetDate);
            dayDate.setUTCDate(targetDate.getUTCDate() - (13 - i));
            dayDate.setUTCHours(0, 0, 0, 0);

            const progress = i / 13;
            const recentBoost = i >= 11 ? (i - 10) / 3 : 0;
            const n1 = seededNoise(seed, i, 1) * 0.05;
            const n2 = seededNoise(seed, i, 2) * 0.06;
            const n3 = seededNoise(seed, i, 3) * 0.08;

            const drivingFactor = 1 + (profile.drivingBase * progress) + (profile.drivingRecent * recentBoost) + n1;
            const nightFactor = 1 + (profile.nightBase * progress) + (profile.nightRecent * recentBoost) + n2;
            const aggressionFactor = 1 + (profile.aggressionBase * progress) + (profile.aggressionRecent * recentBoost) + n3;

            const totalDrivingHours = Number(clamp(baseDriving * drivingFactor, 2.5, 15).toFixed(2));
            const nightDrivingHours = Number(clamp(baseNight * nightFactor, 0.2, totalDrivingHours * 0.8).toFixed(2));
            const totalDistance = Number(clamp(baseDistance * (0.92 + progress * 0.16 + seededNoise(seed, i, 4) * 0.05), 55, 620).toFixed(2));
            const aggressionRate = Number(clamp(baseAggression * aggressionFactor, 0.4, 9.5).toFixed(2));

            const eventCount = Math.max(1, Math.round((aggressionRate * totalDistance) / 100));
            const harshBrakeCount = Math.max(0, Math.round(eventCount * (0.30 + seededNoise(seed, i, 5) * 0.08)));
            const accelerationCount = Math.max(0, Math.round(eventCount * (0.33 + seededNoise(seed, i, 6) * 0.08)));
            const speedingCount = Math.max(0, eventCount - harshBrakeCount - accelerationCount);

            syntheticMetrics.push({
                driver_id: driverId,
                driver_name: latest.driver_name || driverId,
                first_name: latest.first_name || '',
                last_name: latest.last_name || '',
                date: dayDate,
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
                vehicle_license_plate: latest.vehicle_license_plate || '',
                demo_route: getDemoRoute(seed)
            });
        }
    }

    return syntheticMetrics;
};

// Get Fleet Overview Stats
app.get('/api/overview', async (req, res) => {
    try {
        const targetDate = new Date();
        targetDate.setUTCHours(0, 0, 0, 0);
        // Look at yesterday if today hasn't run yet
        targetDate.setUTCDate(targetDate.getUTCDate() - 1);

        // Fetch distinctly saved baseline profiles to get the list of drivers
        const profiles = await DriverBaselineProfile.find({ date: targetDate });

        const driversList = [];
        let high = 0, mod = 0, mild = 0, stable = 0;

        // Fetch 14-day history window
        const fromDate = new Date(targetDate);
        fromDate.setUTCDate(fromDate.getUTCDate() - 14);

        for (const p of profiles) {
            // Re-calculate the full object for the dashboard table
            const report = await calculateDriverDrift(p.driver_id, targetDate);
            if (!report) continue;

            // Fetch daily metrics for this driver
            const dailyMetrics = await DriverDailyMetric.find({
                driver_id: p.driver_id,
                date: { $gte: fromDate, $lte: targetDate }
            }).sort({ date: 1 });

            // Transform metrics to match frontend expectations
            const transformedMetrics = dailyMetrics.map(m => ({
                date: m.date.toISOString().split('T')[0],
                totalDrivingHours: m.total_driving_hours || 0,
                totalDistance: m.total_distance || 0,
                nightDrivingHours: m.night_driving_hours || 0,
                harshBrakeCount: m.harsh_brake_count || 0,
                accelerationCount: m.acceleration_count || 0,
                speedingCount: m.speeding_count || 0,
                aggressionRate: m.aggression_rate || 0
            }));

            // Get the most recent vehicle name for this driver
            const latestMetricWithVehicle = [...dailyMetrics].reverse().find(m => m.vehicle_name);
            const vehicleName = latestMetricWithVehicle ? latestMetricWithVehicle.vehicle_name : '';
            const vehicleId = latestMetricWithVehicle ? latestMetricWithVehicle.vehicle_id : '';

            // Map risk level to frontend format
            const riskLevelMap = {
                'High Strain': 'high',
                'Moderate Strain': 'moderate',
                'Mild Strain': 'mild',
                'Stable': 'stable'
            };

            driversList.push({
                id: report.driver_id,
                name: report.driver_name,
                firstName: report.first_name || '',
                lastName: report.last_name || '',
                avatar: "",
                vehicleId: vehicleId,
                vehicleName: vehicleName,
                route: "",
                dailyMetrics: transformedMetrics,
                baseline: {
                    avgDrivingHours: report.baseline.avg_driving_hours,
                    avgNightHours: report.baseline.avg_night_hours,
                    avgAggressionRate: report.baseline.avg_aggression_rate,
                    stdAggressionRate: report.baseline.aggression_volatility
                },
                recent: {
                    recentDrivingHours: report.recent.recent_driving_hours,
                    recentNightHours: report.recent.recent_night_hours,
                    recentAggressionRate: report.recent.recent_aggression_rate
                },
                drift: {
                    drivingHoursDrift: report.drift.driving_hours_drift,
                    nightHoursDrift: report.drift.night_hours_drift,
                    aggressionDrift: report.drift.aggression_drift
                },
                burnout: {
                    score: report.score.burnout_score,
                    level: riskLevelMap[report.score.risk_level] || 'stable',
                    consecutiveDays: report.score.consecutive_strain_days || 0,
                    volatilityRising: report.score.volatility_alert
                },
                nudgeMessage: report.notification.message || "",
                lastActive: targetDate.toISOString()
            });

            if (report.score.risk_level === 'High Strain') high++;
            else if (report.score.risk_level === 'Moderate Strain') mod++;
            else if (report.score.risk_level === 'Mild Strain') mild++;
            else stable++;
        }

        // Sort by burnout score descending (highest risk first)
        driversList.sort((a, b) => b.burnout.score - a.burnout.score);

        // Calculate additional metrics
        const avgBurnoutScore = driversList.length > 0 
            ? driversList.reduce((sum, d) => sum + d.burnout.score, 0) / driversList.length 
            : 0;
        
        const driversAtRisk = driversList.filter(d => d.burnout.level === 'high' || d.burnout.level === 'moderate').length;
        
        const volatilityAlerts = driversList.filter(d => d.burnout.volatilityRising).length;

        res.json({
            stats: {
                totalDrivers: profiles.length,
                high,
                mod,
                mild,
                stable,
                avgBurnoutScore: Number(avgBurnoutScore.toFixed(2)),
                driversAtRisk,
                volatilityAlerts,
                driftDistribution: { stable, mild: mod, moderate: mild, high }
            },
            drivers: driversList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get individual driver 14-day chart data
app.get('/api/drivers/:id/history', async (req, res) => {
    try {
        const driver_id = req.params.id;
        const toDate = new Date();
        toDate.setUTCHours(0, 0, 0, 0);

        const fromDate = new Date(toDate);
        fromDate.setUTCDate(fromDate.getUTCDate() - 14);

        const metrics = await DriverDailyMetric.find({
            driver_id,
            date: { $gte: fromDate, $lte: toDate }
        }).sort({ date: 1 });

        const history = metrics.map(m => ({
            date: m.date.toISOString().split('T')[0],
            driving_hours: m.total_driving_hours,
            night_hours: m.night_driving_hours,
            aggression_rate: m.aggression_rate
        }));

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mock overview endpoint for demo mode
app.get('/api/mock/overview', async (req, res) => {
    try {
        const latestMockMetric = await MockDriverDailyMetric.findOne().sort({ date: -1 });
        let metrics = [];
        let targetDate = null;
        let dataSource = 'unknown';
        let usedGenerated = false;

        if (latestMockMetric) {
            targetDate = new Date(latestMockMetric.date);
            targetDate.setUTCHours(0, 0, 0, 0);
            const fromDate = new Date(targetDate);
            fromDate.setUTCDate(fromDate.getUTCDate() - 13);

            metrics = await MockDriverDailyMetric.find({
                date: { $gte: fromDate, $lte: targetDate }
            }).sort({ driver_id: 1, date: 1 });
        } else {
            // Fallback: use latest 2 days from live collection so mock tab is never empty.
            const latestDates = await DriverDailyMetric.distinct('date');
            const sortedDates = latestDates
                .map((date) => new Date(date))
                .sort((a, b) => b - a)
                .slice(0, 2);

            if (!sortedDates.length) {
                return res.json({
                    stats: {
                        totalDrivers: 0,
                        high: 0,
                        mod: 0,
                        mild: 0,
                        stable: 0,
                        avgBurnoutScore: 0,
                        driversAtRisk: 0,
                        volatilityAlerts: 0,
                        driftDistribution: { stable: 0, mild: 0, moderate: 0, high: 0 }
                    },
                    drivers: []
                });
            }

            const fromDate = sortedDates[sortedDates.length - 1];
            const toDate = sortedDates[0];
            targetDate = new Date(toDate);
            targetDate.setUTCHours(0, 0, 0, 0);

            metrics = await DriverDailyMetric.find({
                date: { $gte: fromDate, $lte: toDate }
            }).sort({ driver_id: 1, date: 1 });
        }

        const uniqueDateCount = new Set(metrics.map((m) => new Date(m.date).toISOString().split('T')[0])).size;
        const aggressionDistinct = new Set(metrics.map((m) => Number(m.aggression_rate || 0).toFixed(2))).size;
        if (metrics.length && (uniqueDateCount < 14 || aggressionDistinct < 4)) {
            metrics = generateDemoMetricsFromSeeds(metrics, targetDate);
            usedGenerated = true;
        }

        const metricsByDriver = new Map();
        for (const metric of metrics) {
            if (!metricsByDriver.has(metric.driver_id)) {
                metricsByDriver.set(metric.driver_id, []);
            }
            metricsByDriver.get(metric.driver_id).push(metric);
        }

        let high = 0, mod = 0, mild = 0, stable = 0;
        const driversList = [];

        for (const [driverId, driverMetrics] of metricsByDriver.entries()) {
            if (!driverMetrics.length) continue;

            const metricsAsc = driverMetrics;
            const metricsDesc = [...driverMetrics].reverse();
            const latest = metricsDesc[0];

            const recentWindowCount = Math.min(3, metricsAsc.length);
            const recentWindow = metricsAsc.slice(-recentWindowCount);
            const baselineWindow = metricsAsc.length > recentWindowCount
                ? metricsAsc.slice(0, metricsAsc.length - recentWindowCount)
                : metricsAsc;

            const avgDrivingHours = average(baselineWindow.map((m) => m.total_driving_hours || 0));
            const avgNightHours = average(baselineWindow.map((m) => m.night_driving_hours || 0));
            const avgAggressionRate = average(baselineWindow.map((m) => m.aggression_rate || 0));
            const aggressionVolatility = stdDev(
                baselineWindow.map((m) => m.aggression_rate || 0),
                avgAggressionRate
            );

            const recentDrivingHours = average(recentWindow.map((m) => m.total_driving_hours || 0));
            const recentNightHours = average(recentWindow.map((m) => m.night_driving_hours || 0));
            const recentAggressionRate = average(recentWindow.map((m) => m.aggression_rate || 0));

            const drivingHoursDrift = calcDrift(recentDrivingHours, avgDrivingHours);
            const nightHoursDrift = calcDrift(recentNightHours, avgNightHours);
            const aggressionDrift = calcDrift(recentAggressionRate, avgAggressionRate);

            const burnoutScore = Number(((drivingHoursDrift * 0.4) + (nightHoursDrift * 0.3) + (aggressionDrift * 0.3)).toFixed(2));
            const risk = getRiskLevel(burnoutScore);
            const consecutiveDays = countConsecutiveStrainDays(metricsDesc, {
                avgDrivingHours,
                avgNightHours,
                avgAggressionRate
            });
            const volatilityAlert = aggressionVolatility > 2;

            if (risk.frontend === 'high') high++;
            else if (risk.frontend === 'moderate') mod++;
            else if (risk.frontend === 'mild') mild++;
            else stable++;

            const transformedMetrics = metricsAsc.map((m) => ({
                date: m.date.toISOString().split('T')[0],
                totalDrivingHours: m.total_driving_hours || 0,
                totalDistance: m.total_distance || 0,
                nightDrivingHours: m.night_driving_hours || 0,
                harshBrakeCount: m.harsh_brake_count || 0,
                accelerationCount: m.acceleration_count || 0,
                speedingCount: m.speeding_count || 0,
                aggressionRate: m.aggression_rate || 0
            }));

            const displayName = latest.driver_name || driverId;
            const firstName = latest.first_name || displayName.split(' ')[0] || 'Driver';
            const lastName = latest.last_name || '';

            driversList.push({
                id: driverId,
                name: displayName,
                firstName,
                lastName,
                avatar: '',
                vehicleId: latest.vehicle_id || '',
                vehicleName: latest.vehicle_name || '',
                route: latest.demo_route || 'Demo Route',
                dailyMetrics: transformedMetrics,
                baseline: {
                    avgDrivingHours: Number(avgDrivingHours.toFixed(2)),
                    avgNightHours: Number(avgNightHours.toFixed(2)),
                    avgAggressionRate: Number(avgAggressionRate.toFixed(2)),
                    stdAggressionRate: Number(aggressionVolatility.toFixed(2))
                },
                recent: {
                    recentDrivingHours: Number(recentDrivingHours.toFixed(2)),
                    recentNightHours: Number(recentNightHours.toFixed(2)),
                    recentAggressionRate: Number(recentAggressionRate.toFixed(2))
                },
                drift: {
                    drivingHoursDrift: Number(drivingHoursDrift.toFixed(2)),
                    nightHoursDrift: Number(nightHoursDrift.toFixed(2)),
                    aggressionDrift: Number(aggressionDrift.toFixed(2))
                },
                burnout: {
                    score: burnoutScore,
                    level: risk.frontend,
                    consecutiveDays,
                    volatilityRising: volatilityAlert
                },
                nudgeMessage: buildMockNudge(firstName, risk.frontend, {
                    drivingHoursDrift,
                    nightHoursDrift,
                    aggressionDrift
                }),
                lastActive: targetDate.toISOString()
            });
        }

        driversList.sort((a, b) => b.burnout.score - a.burnout.score);

        const avgBurnoutScore = driversList.length
            ? driversList.reduce((sum, driver) => sum + driver.burnout.score, 0) / driversList.length
            : 0;
        const driversAtRisk = driversList.filter((driver) => driver.burnout.level === 'high' || driver.burnout.level === 'moderate').length;
        const volatilityAlerts = driversList.filter((driver) => driver.burnout.volatilityRising).length;

        // Decide and expose data source so frontend / testers can prove origin
        if (latestMockMetric) dataSource = 'mock-collection';
        else if (usedGenerated) dataSource = 'mock-generated-from-live';
        else dataSource = 'live';

        res.set('X-Data-Source', dataSource);

        res.json({
            dataSource,
            stats: {
                totalDrivers: driversList.length,
                high,
                mod,
                mild,
                stable,
                avgBurnoutScore: Number(avgBurnoutScore.toFixed(2)),
                driversAtRisk,
                volatilityAlerts,
                driftDistribution: { stable, mild, moderate: mod, high }
            },
            drivers: driversList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual data refresh endpoint
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('🔄 Manual refresh requested...');
        const result = await triggerManualRefresh();
        res.json(result);
    } catch (err) {
        console.error('❌ Manual refresh failed:', err);
        res.status(500).json({ error: 'Refresh failed: ' + err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Start automatic data updates
    setTimeout(() => {
        startScheduler();
    }, 2000); // Give server a moment to fully start
});
