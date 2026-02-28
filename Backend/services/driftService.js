const DriverDailyMetric = require('../models/DriverDailyMetric');
const DriverBaselineProfile = require('../models/DriverBaselineProfile');

// Generate personalized, caring messages based on driver's risk level and patterns
function generateCaringMessage(riskLevel, firstName, driftPatterns) {
    const { driving_hours_drift, night_hours_drift, aggression_drift, volatility_alert } = driftPatterns;
    
    // Base caring messages for each risk level
    const messages = {
        'High Strain': [
            `Hi ${firstName}, we've noticed you've been pushing yourself extra hard lately. Your wellbeing matters to us - perhaps it's time for a well-deserved break?`,
            `${firstName}, you've been working incredibly hard recently. We truly appreciate your dedication, but please remember to take care of yourself too.`,
            `Hey ${firstName}, we care about you and want to make sure you're okay. Your recent driving patterns suggest you might need some rest - you've earned it!`,
        ],
        'Moderate Strain': [
            `Hello ${firstName}, we've noticed you've been working longer hours lately. Just wanted to check in and remind you that your health and safety come first.`,
            `Hi ${firstName}, you're putting in great effort, but we want to make sure you're not overextending yourself. Consider taking some time to recharge.`,
            `${firstName}, we appreciate how hard you've been working. Just a gentle reminder to pace yourself and take breaks when you need them.`,
        ],
        'Mild Strain': [
            `Hi ${firstName}, we noticed a slight change in your driving patterns. Nothing concerning, just wanted to remind you that we're here if you need support.`,
            `Hello ${firstName}, you're doing great work! Just a friendly check-in to make sure you're feeling good and taking care of yourself.`,
            `${firstName}, keep up the excellent work! We're just dropping by to remind you to listen to your body and take breaks as needed.`,
        ]
    };
    
    // Get base message
    const baseMessages = messages[riskLevel] || messages['Mild Strain'];
    let message = baseMessages[Math.floor(Math.random() * baseMessages.length)];
    
    // Add specific context based on drift patterns
    if (riskLevel === 'High Strain') {
        if (night_hours_drift > 50) {
            message += ` We noticed you've been driving more at night recently - please prioritize getting enough rest.`;
        }
        if (aggression_drift > 40 || volatility_alert) {
            message += ` Your stress levels might be elevated - consider some relaxation techniques or speaking with someone you trust.`;
        }
        if (driving_hours_drift > 50) {
            message += ` The long hours you've been putting in are noticed and appreciated, but your safety is our top priority.`;
        }
    } else if (riskLevel === 'Moderate Strain') {
        if (night_hours_drift > 30) {
            message += ` We see you've been working some late hours - make sure to get quality sleep when you can.`;
        }
        if (driving_hours_drift > 30) {
            message += ` The extra effort you're putting in doesn't go unnoticed, just remember to balance it with rest.`;
        }
    }
    
    // Add supportive closing
    const closings = [
        ` Remember, we're here to support you. 💙`,
        ` Take care of yourself - you matter to us. 🙏`,
        ` Your wellbeing is important to the whole team. 💚`,
        ` We're grateful for all you do, and we care about you. ❤️`
    ];
    
    message += closings[Math.floor(Math.random() * closings.length)];
    
    return message;
}

// Calculate consecutive days that meet strain criteria (Hours Drift > 25% AND Night Drift > 20% AND Aggression Drift > 20%)
function calculateConsecutiveStrainDays(metrics14, baseline) {
    if (metrics14.length === 0) return 0;
    
    const { avg_driving_hours, avg_night_hours, avg_aggression_rate } = baseline;
    
    // Helper function to calculate drift percentage 
    const calcDrift = (value, baseline_val) => {
        if (baseline_val === 0) {
            return value > 0 ? 100 : 0;
        }
        return ((value - baseline_val) / baseline_val) * 100;
    };
    
    // Check strain criteria for each day (going backward from most recent)
    let consecutiveDays = 0;
    const sortedMetrics = [...metrics14].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (let i = 0; i < Math.min(sortedMetrics.length, 7); i++) { // Check last 7 days maximum
        const metric = sortedMetrics[i];
        
        const driving_drift = calcDrift(metric.total_driving_hours || 0, avg_driving_hours);
        const night_drift = calcDrift(metric.night_driving_hours || 0, avg_night_hours); 
        const aggression_drift = calcDrift(metric.aggression_rate || 0, avg_aggression_rate);
        
        // Check if this day meets strain criteria
        const meetsStrainCriteria = (
            driving_drift > 25 && 
            night_drift > 20 && 
            aggression_drift > 20
        );
        
        if (meetsStrainCriteria) {
            consecutiveDays++;
        } else {
            break; // Stop counting if we hit a non-strain day
        }
    }
    
    return consecutiveDays;
}

async function calculateDriverDrift(driver_id, targetDate = new Date()) {
    // 14 day window
    const fourteenDaysAgo = new Date(targetDate);
    fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

    // Fetch the metrics for the last 14 days
    const metrics14 = await DriverDailyMetric.find({
        driver_id,
        date: { $gte: fourteenDaysAgo, $lte: targetDate }
    }).sort({ date: 1 });

    if (metrics14.length === 0) return null;

    // --- STEP 4: Build Baseline Profile ---
    let sum_driving = 0, sum_night = 0, sum_aggression = 0;
    const agg_rates = [];

    for (const m of metrics14) {
        sum_driving += m.total_driving_hours || 0;
        sum_night += m.night_driving_hours || 0;
        sum_aggression += m.aggression_rate || 0;
        agg_rates.push(m.aggression_rate || 0);
    }

    const count = 14; // Fixed 14-day window for baseline
    const avg_driving_hours = sum_driving / count;
    const avg_night_hours = sum_night / count;
    const avg_aggression_rate = sum_aggression / count;

    // Find a driver name if available, prioritizing newer entries
    const latestMetricWithName = [...metrics14].reverse().find(m => m.driver_name);
    const driver_name = latestMetricWithName ? latestMetricWithName.driver_name : driver_id;
    const first_name = latestMetricWithName ? latestMetricWithName.first_name || '' : '';
    const last_name = latestMetricWithName ? latestMetricWithName.last_name || '' : '';

    // Step 11: Volatility Detection (Standard deviation of aggression over 14 days)
    let sum_sq_diff = 0;
    for (const rate of agg_rates) {
        sum_sq_diff += Math.pow(rate - avg_aggression_rate, 2);
    }
    const aggression_volatility = Math.sqrt(sum_sq_diff / count);

    // Save Baseline Profile
    await DriverBaselineProfile.findOneAndUpdate(
        { driver_id, date: targetDate },
        {
            driver_name,
            first_name,
            last_name,
            avg_driving_hours,
            avg_night_hours,
            avg_aggression_rate,
            aggression_volatility
        },
        { upsert: true, new: true }
    );

    // --- STEP 5: Calculate Short-Term Window (Last 3 Days) ---
    const threeDaysAgo = new Date(targetDate);
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

    const metrics3 = metrics14.filter(m => new Date(m.date) > threeDaysAgo);
    let st_sum_driving = 0, st_sum_night = 0, st_sum_aggression = 0;

    for (const m of metrics3) {
        st_sum_driving += m.total_driving_hours || 0;
        st_sum_night += m.night_driving_hours || 0;
        st_sum_aggression += m.aggression_rate || 0;
    }

    const count3 = 3; // Fixed 3-day window for recent trend
    const recent_driving_hours = st_sum_driving / count3;
    const recent_night_hours = st_sum_night / count3;
    const recent_aggression_rate = st_sum_aggression / count3;

    // --- STEP 6: Calculate Drift % ---
    // If baseline is 0, any recent value > 0 shouldn't mathematically explode to ~inf (which caused 630.0).
    // Using a more stabilized ratio for zero-baselines (e.g. capped at 100% or absolute value fallback)
    const calcDrift = (recent, baseline) => {
        if (baseline === 0) {
            return recent > 0 ? 100 : 0; // Cap at 100% for 0 baseline to prevent identical giant scores
        }
        return ((recent - baseline) / baseline) * 100;
    };

    const driving_hours_drift = calcDrift(recent_driving_hours, avg_driving_hours);
    const night_hours_drift = calcDrift(recent_night_hours, avg_night_hours);
    const aggression_drift = calcDrift(recent_aggression_rate, avg_aggression_rate);

    // --- STEP 8: Burnout Risk Score ---
    const burnout_score = (driving_hours_drift * 0.4) + (night_hours_drift * 0.3) + (aggression_drift * 0.3);

    let risk_level = 'Stable';
    if (burnout_score >= 50) risk_level = 'High Strain';
    else if (burnout_score >= 30) risk_level = 'Moderate Strain';
    else if (burnout_score >= 15) risk_level = 'Mild Strain';

    // --- STEP 7: Create Burnout Risk Logic & Consecutive Day Tracking ---
    let is_strain_risk = false;
    let consecutive_strain_days = 0;
    
    // Calculate consecutive days that meet strain criteria
    consecutive_strain_days = calculateConsecutiveStrainDays(metrics14, {
        avg_driving_hours,
        avg_night_hours, 
        avg_aggression_rate
    });
    
    if (consecutive_strain_days >= 3) {
        is_strain_risk = true;
    }

    // Step 11 Check
    let volatility_alert = false;
    if (aggression_volatility > 2) { // Just an arbitrary reasonable threshold to trigger for demo
        volatility_alert = true;
    }

    // --- STEP 9: Notification Trigger ---
    let notification_triggered = false;
    let notification_message = "";
    
    // Generate personalized, caring messages based on risk level and patterns
    if (burnout_score >= 15) {
        notification_triggered = true;
        notification_message = generateCaringMessage(
            risk_level, 
            first_name || driver_name.split('@')[0] || 'Driver',
            {
                driving_hours_drift,
                night_hours_drift, 
                aggression_drift,
                volatility_alert
            }
        );
    }

    return {
        driver_id,
        driver_name,
        first_name,
        last_name,
        date: targetDate,
        baseline: {
            avg_driving_hours: Number(avg_driving_hours.toFixed(2)),
            avg_night_hours: Number(avg_night_hours.toFixed(2)),
            avg_aggression_rate: Number(avg_aggression_rate.toFixed(2)),
            aggression_volatility: Number(aggression_volatility.toFixed(2))
        },
        recent: {
            recent_driving_hours: Number(recent_driving_hours.toFixed(2)),
            recent_night_hours: Number(recent_night_hours.toFixed(2)),
            recent_aggression_rate: Number(recent_aggression_rate.toFixed(2))
        },
        drift: {
            driving_hours_drift: Number(driving_hours_drift.toFixed(2)),
            night_hours_drift: Number(night_hours_drift.toFixed(2)),
            aggression_drift: Number(aggression_drift.toFixed(2))
        },
        score: {
            burnout_score: Number(burnout_score.toFixed(2)),
            risk_level,
            is_strain_risk,
            volatility_alert,
            consecutive_strain_days
        },
        notification: {
            triggered: notification_triggered,
            message: notification_message
        }
    };
}

module.exports = { calculateDriverDrift };
