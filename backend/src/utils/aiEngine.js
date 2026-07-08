const FuelEntry = require('../models/FuelEntry');
const Service = require('../models/Service');
const Document = require('../models/Document');
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

/**
 * Calls the Google Gemini API to generate custom predictions and insights
 */
const generateInsightsWithGemini = async (vehicle, kmPerDay, fuelEntries, completedTrips, documents, services, ruleBasedResults) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const fuelLogsSummary = fuelEntries.slice(-5).map(e => ({
      date: e.date,
      odometer: e.odometer,
      liters: e.liters,
      pricePerLiter: e.pricePerLiter,
      totalCost: e.totalCost,
      mileage: e.mileage
    }));

    const tripsSummary = completedTrips.slice(-5).map(t => ({
      date: t.startDate,
      distance: t.distance,
      duration: t.duration,
      purpose: t.purpose,
      startLocation: t.startLocation,
      endLocation: t.endLocation
    }));

    const docsSummary = documents.map(d => ({
      name: d.name,
      type: d.type,
      expiryDate: d.expiryDate
    }));

    const servicesSummary = services.slice(-3).map(s => ({
      date: s.date,
      type: s.type,
      odometer: s.odometer,
      cost: s.cost
    }));

    const prompt = `
You are the AI brain for the "DrivePulse" vehicle mileage and maintenance tracker dashboard.
Analyze the following vehicle telemetry, logs, and papers to generate custom insights and predictions:

Vehicle: ${vehicle.brand} ${vehicle.model} (${vehicle.type})
Current Odometer: ${vehicle.currentOdometer} km
Starting Odometer: ${vehicle.startOdometer} km
Current daily average usage: ${kmPerDay} km/day

Telemetry Summaries:
- Recent Refuels: ${JSON.stringify(fuelLogsSummary)}
- Recent Trips: ${JSON.stringify(tripsSummary)}
- Document Expirations: ${JSON.stringify(docsSummary)}
- Recent General Services: ${JSON.stringify(servicesSummary)}

Rule-Based baseline predictions (for context):
- Fuel stop days remaining: ${ruleBasedResults.fuelPrediction.daysRemaining} days
- Service due in days: ${ruleBasedResults.servicePrediction.dueInDays} days
- Forecasted month expense: INR ${ruleBasedResults.expensePrediction.forecastExpense}

Generate a JSON object matching exactly this schema:
{
  "insights": [
    "Context-relevant mileage feedback or station warning (1 sentence). Start with a bulb emoji 💡.",
    "Riding behaviors observation (1 sentence). Start with 💡.",
    "Maintenance check warnings or chain lubrication due reminders based on distance velocity (1 sentence). Start with 💡.",
    "Finance check or money saving advice (1 sentence). Start with 💡."
  ],
  "fuelPredictionDays": 5,
  "servicePredictionDays": 90,
  "forecastExpense": 2500
}

Return ONLY the JSON object. Do not wrap it in markdown block.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      console.warn('Gemini API request failed with status:', response.status);
      return null;
    }

    const resJson = await response.json();
    const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text.trim());
      return parsed;
    }
  } catch (error) {
    console.error('Failed to generate insights with Gemini API:', error.message);
  }
  return null;
};

/**
 * Calculates a vehicle's health score (0-100) and lists health factors.
 */
const calculateHealthScore = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  const currentOdo = vehicle.currentOdometer;

  // 1. Insurance (5%) and PUC (5%) Expiry check
  const documents = await Document.find({ vehicle: vehicleId });
  const insuranceDoc = documents.find(d => d.type === 'Insurance');
  const pucDoc = documents.find(d => d.type === 'PUC');

  const now = new Date();
  let insuranceScore = 5;
  let pucScore = 5;

  if (!insuranceDoc || (insuranceDoc.expiryDate && new Date(insuranceDoc.expiryDate) < now)) {
    insuranceScore = 0;
  }
  if (!pucDoc || (pucDoc.expiryDate && new Date(pucDoc.expiryDate) < now)) {
    pucScore = 0;
  }

  // 2. Battery (5%) check (Assume batteries last 2 years / 24 months)
  const batteryService = await Service.findOne({ vehicle: vehicleId, type: 'Battery' }).sort({ date: -1 });
  let batteryScore = 5;
  if (batteryService) {
    const batteryAgeMonths = (now - new Date(batteryService.date)) / (1000 * 60 * 60 * 24 * 30.4);
    if (batteryAgeMonths > 24) {
      batteryScore = Math.max(0, 5 - (batteryAgeMonths - 24) * 0.2); // Linear penalty after 2 years
    }
  } else {
    // Check vehicle age if no service record
    const vehicleAgeYears = now.getFullYear() - vehicle.year;
    if (vehicleAgeYears > 2) batteryScore = 2; // Slight penalty if older vehicle with no battery logs
  }

  // 3. Tyres (10%) check (Assume tyres last 20,000 km)
  const tyreService = await Service.findOne({ vehicle: vehicleId, type: 'Tyres' }).sort({ date: -1 });
  let tyreScore = 10;
  if (tyreService) {
    const odoSinceTyreChange = currentOdo - tyreService.odometer;
    if (odoSinceTyreChange > 20000) {
      tyreScore = Math.max(0, 10 - (odoSinceTyreChange - 20000) * 0.001); // Penalty of 1 point per 1000km over
    }
  } else {
    const odoSinceStart = currentOdo - vehicle.startOdometer;
    if (odoSinceStart > 20000) {
      tyreScore = Math.max(2, 10 - (odoSinceStart - 20000) * 0.0005);
    }
  }

  // 4. Fuel Efficiency (25%) check
  // Compare average of last 3 full entries against historical average
  const fuelEntries = await FuelEntry.find({ vehicle: vehicleId, mileage: { $ne: null } }).sort({ odometer: -1 });
  let fuelScore = 25;
  if (fuelEntries.length >= 3) {
    const recentAvg = (fuelEntries[0].mileage + fuelEntries[1].mileage + fuelEntries[2].mileage) / 3;
    const totalSum = fuelEntries.reduce((sum, entry) => sum + entry.mileage, 0);
    const historicalAvg = totalSum / fuelEntries.length;

    if (recentAvg < historicalAvg) {
      const dropPercentage = ((historicalAvg - recentAvg) / historicalAvg) * 100;
      // Deduct 1.5 points for every 1% drop below historical average, max 25 points deduction
      fuelScore = Math.max(0, parseFloat((25 - dropPercentage * 1.5).toFixed(1)));
    }
  }

  // 5. General Service History (30%) check
  // Standard general service interval: 5000 km or 6 months (180 days)
  const generalServices = await Service.find({ 
    vehicle: vehicleId, 
    type: { $in: ['General Service', 'Oil Change'] } 
  }).sort({ odometer: -1 });

  let serviceScore = 30;
  if (generalServices.length > 0) {
    const lastService = generalServices[0];
    const kmSinceService = currentOdo - lastService.odometer;
    const daysSinceService = (now - new Date(lastService.date)) / (1000 * 60 * 60 * 24);

    const kmOverdue = Math.max(0, kmSinceService - 5000);
    const daysOverdue = Math.max(0, daysSinceService - 180);

    const kmPenalty = (kmOverdue / 1000) * 5; // 5 points per 1000km overdue
    const daysPenalty = (daysOverdue / 30) * 5; // 5 points per month overdue

    serviceScore = Math.max(0, parseFloat((30 - Math.max(kmPenalty, daysPenalty)).toFixed(1)));
  } else {
    // No services logged
    const totalKm = currentOdo - vehicle.startOdometer;
    if (totalKm > 5000) {
      serviceScore = Math.max(5, parseFloat((30 - (totalKm - 5000) * 0.003).toFixed(1)));
    }
  }

  // 6. Chain Lubrication Maintenance (20%) check
  // Interval: 500 km or 30 days
  const chainLubServ = await Service.findOne({ vehicle: vehicleId, type: 'Chain Lube' }).sort({ odometer: -1 });
  let chainScore = 20;
  if (chainLubServ) {
    const kmSinceChain = currentOdo - chainLubServ.odometer;
    const daysSinceChain = (now - new Date(chainLubServ.date)) / (1000 * 60 * 60 * 24);

    const kmOverdue = Math.max(0, kmSinceChain - 500);
    const daysOverdue = Math.max(0, daysSinceChain - 30);

    const chainPenalty = (kmOverdue / 100) * 4 + (daysOverdue / 7) * 4; // Penalize for mileage and time
    chainScore = Math.max(0, parseFloat((20 - chainPenalty).toFixed(1)));
  } else {
    // If it's a bike/scooter, apply penalty if distance since start exceeds 1000km
    if (vehicle.type === 'bike' || vehicle.type === 'scooter') {
      const totalKm = currentOdo - vehicle.startOdometer;
      if (totalKm > 1000) chainScore = Math.max(0, 20 - (totalKm - 1000) * 0.01);
    }
  }

  const finalScore = Math.round(insuranceScore + pucScore + batteryScore + tyreScore + fuelScore + serviceScore + chainScore);

  let status = 'Excellent Condition';
  if (finalScore < 60) {
    status = 'Critical Attention Required';
  } else if (finalScore < 80) {
    status = 'Fair Condition';
  } else if (finalScore < 90) {
    status = 'Good Condition';
  }

  return {
    score: finalScore,
    status,
    factors: {
      insurance: { score: insuranceScore, max: 5 },
      puc: { score: pucScore, max: 5 },
      battery: { score: batteryScore, max: 5 },
      tyres: { score: tyreScore, max: 10 },
      fuelEfficiency: { score: fuelScore, max: 25 },
      serviceHistory: { score: serviceScore, max: 30 },
      maintenance: { score: chainScore, max: 20 },
    },
  };
};

/**
 * Generates predictions and AI-driven insights for a vehicle
 */
const getPredictionsAndInsights = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  const now = new Date();

  // 1. Calculate Average Daily Distance
  // Look back at fuel entries over the last 90 days or use absolute first/last entry
  const fuelEntries = await FuelEntry.find({ vehicle: vehicleId }).sort({ odometer: 1 });
  let kmPerDay = 15; // default fallback

  if (fuelEntries.length >= 2) {
    const firstEntry = fuelEntries[0];
    const lastEntry = fuelEntries[fuelEntries.length - 1];
    const timespanDays = (new Date(lastEntry.date) - new Date(firstEntry.date)) / (1000 * 60 * 60 * 24);
    const totalDist = lastEntry.odometer - firstEntry.odometer;

    if (timespanDays > 0.5 && totalDist > 0) {
      kmPerDay = Math.max(1, totalDist / timespanDays);
    }
  }

  // 2. Predict next Service (General / Oil Change)
  const lastService = await Service.findOne({ 
    vehicle: vehicleId, 
    type: { $in: ['General Service', 'Oil Change'] } 
  }).sort({ odometer: -1 });

  let servicePrediction = {
    dueInKm: 5000,
    dueInDays: 333,
    dueDate: new Date(now.getTime() + 333 * 24 * 60 * 60 * 1000),
    message: 'At your current riding pattern, your next service will likely be needed in 333 days.'
  };

  if (lastService) {
    const targetOdo = lastService.odometer + 5000;
    const remainingKm = targetOdo - vehicle.currentOdometer;
    const daysRemaining = Math.max(1, Math.round(remainingKm / kmPerDay));
    const predictedDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

    servicePrediction = {
      dueInKm: remainingKm,
      dueInDays: daysRemaining,
      dueDate: predictedDate,
      message: remainingKm <= 0 
        ? 'Service is OVERDUE.' 
        : `At your current riding pattern, your next service will likely be needed in ${daysRemaining} days (${remainingKm} km remaining).`
    };
  } else {
    // Predict based on starting odometer
    const targetOdo = vehicle.startOdometer + 5000;
    const remainingKm = targetOdo - vehicle.currentOdometer;
    const daysRemaining = Math.max(1, Math.round(remainingKm / kmPerDay));
    const predictedDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

    servicePrediction = {
      dueInKm: remainingKm,
      dueInDays: daysRemaining,
      dueDate: predictedDate,
      message: `At your current riding pattern, your next service will likely be needed in ${daysRemaining} days.`
    };
  }

  // 3. Predict next Fuel Refill
  let fuelPrediction = {
    averageGapKm: 280,
    currentOdoSinceRefill: 0,
    daysRemaining: 18,
    message: 'AI predicts: You will probably need fuel within the next 18 days.'
  };

  if (fuelEntries.length >= 2) {
    // Find average gap between refuels
    let totalGaps = 0;
    let gapCount = 0;
    for (let i = 1; i < fuelEntries.length; i++) {
      const gap = fuelEntries[i].odometer - fuelEntries[i - 1].odometer;
      if (gap > 0) {
        totalGaps += gap;
        gapCount++;
      }
    }
    const avgGap = gapCount > 0 ? totalGaps / gapCount : 280;
    const lastRefuel = fuelEntries[fuelEntries.length - 1];
    const currentDistSinceRefuel = vehicle.currentOdometer - lastRefuel.odometer;
    const remainingKm = Math.max(0, avgGap - currentDistSinceRefuel);
    const daysRemaining = Math.max(0, Math.round(remainingKm / kmPerDay));

    fuelPrediction = {
      averageGapKm: Math.round(avgGap),
      currentOdoSinceRefill: currentDistSinceRefuel,
      daysRemaining,
      message: daysRemaining <= 0
        ? 'You are likely running on reserve fuel. Refuel immediately!'
        : `You have ridden ${currentDistSinceRefuel} km since last refill. AI predicts you will probably need fuel in ${daysRemaining} day(s) (${Math.round(remainingKm)} km).`
    };
  }

  // 4. Expense Prediction (July/Current Month forecast)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = currentMonthEnd.getDate();
  const currentDay = now.getDate();

  const currentMonthExpenses = await Expense.find({
    vehicle: vehicleId,
    date: { $gte: currentMonthStart, $lte: now }
  });

  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const dailyCostThisMonth = currentDay > 0 ? totalSpentThisMonth / currentDay : 0;
  const forecastMonthExpense = totalSpentThisMonth + dailyCostThisMonth * (daysInMonth - currentDay);

  const expensePrediction = {
    currentMonthExpense: totalSpentThisMonth,
    forecastExpense: Math.round(forecastMonthExpense),
    message: `Expected fuel and vehicle expenses for this month is ₹${Math.round(forecastMonthExpense)} (Current: ₹${totalSpentThisMonth}).`
  };

  // 5. Riding Behaviour (Purpose breakdown)
  const trips = await Trip.find({ vehicle: vehicleId, status: 'completed' });
  const behavior = {
    weekendRider: 0,
    officeCommute: 0,
    other: 0,
  };

  if (trips.length > 0) {
    let weekendCount = 0;
    let officeCount = 0;
    let otherCount = 0;

    trips.forEach(trip => {
      const day = new Date(trip.startDate).getDay(); // 0 = Sun, 6 = Sat, 5 = Fri
      const isWeekend = day === 0 || day === 6 || day === 5;
      
      if (trip.purpose === 'Office' || trip.purpose === 'Business') {
        officeCount++;
      } else if (isWeekend && (trip.purpose === 'Ride' || trip.purpose === 'Vacation' || trip.purpose === 'Personal')) {
        weekendCount++;
      } else {
        otherCount++;
      }
    });

    behavior.weekendRider = Math.round((weekendCount / trips.length) * 100);
    behavior.officeCommute = Math.round((officeCount / trips.length) * 100);
    behavior.other = Math.round((otherCount / trips.length) * 100);
  } else {
    // Default fallback values
    behavior.weekendRider = 50;
    behavior.officeCommute = 30;
    behavior.other = 20;
  }

  // 6. Generate Insights (Comparing fuel stations, mileage drops)
  const insights = [];

  // Insight A: Mileage trends (Compare average of last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentFuel = await FuelEntry.find({
    vehicle: vehicleId,
    date: { $gte: thirtyDaysAgo },
    mileage: { $ne: null }
  });
  const previousFuel = await FuelEntry.find({
    vehicle: vehicleId,
    date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    mileage: { $ne: null }
  });

  if (recentFuel.length > 0 && previousFuel.length > 0) {
    const recentAvg = recentFuel.reduce((s, e) => s + e.mileage, 0) / recentFuel.length;
    const prevAvg = previousFuel.reduce((s, e) => s + e.mileage, 0) / previousFuel.length;

    if (recentAvg < prevAvg) {
      const drop = parseFloat((((prevAvg - recentAvg) / prevAvg) * 100).toFixed(1));
      insights.push(`💡 Mileage has decreased by ${drop}% over the last 30 days. Consider cleaning your air filter or checking tyre pressure.`);
    } else {
      const rise = parseFloat((((recentAvg - prevAvg) / prevAvg) * 100).toFixed(1));
      if (rise > 2) {
        insights.push(`💡 Great! Your average mileage has improved by ${rise}% compared to last month.`);
      }
    }
  }

  // Insight B: Fuel Station Performance comparison
  const stationGroups = {};
  fuelEntries.forEach(entry => {
    if (entry.fuelStation && entry.mileage) {
      const station = entry.fuelStation.trim().toLowerCase();
      if (!stationGroups[station]) stationGroups[station] = [];
      stationGroups[station].push(entry.mileage);
    }
  });

  const stationAverages = Object.keys(stationGroups).map(stationName => {
    const mileages = stationGroups[stationName];
    const avg = mileages.reduce((s, m) => s + m, 0) / mileages.length;
    return { name: stationName, avg, count: mileages.length };
  }).filter(g => g.count >= 2); // Only compare stations with at least 2 entries

  if (stationAverages.length >= 2) {
    stationAverages.sort((a, b) => b.avg - a.avg);
    const best = stationAverages[0];
    const worst = stationAverages[stationAverages.length - 1];
    const diff = parseFloat((best.avg - worst.avg).toFixed(1));

    if (diff > 0.5) {
      const capName = best.name.replace(/\b\w/g, c => c.toUpperCase());
      insights.push(`💡 ${capName} fuel has given you an average of ${diff} km/L better mileage than other stations.`);
    }
  }

  // Insight C: Typical Refuel intervals
  if (fuelPrediction.averageGapKm > 0) {
    insights.push(`💡 You usually refuel every ${fuelPrediction.averageGapKm} km.`);
  }

  // Insight D: Expense trends vs last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthExpenses = await Expense.find({
    vehicle: vehicleId,
    date: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });
  const totalSpentLastMonth = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (totalSpentThisMonth > 0 && totalSpentLastMonth > 0) {
    const diff = totalSpentThisMonth - totalSpentLastMonth;
    if (diff > 0) {
      insights.push(`💡 Your monthly spending has increased by ₹${diff} compared to last month.`);
    } else if (diff < 0) {
      insights.push(`💡 Excellent! You spent ₹${Math.abs(diff)} less on your vehicle this month compared to last month.`);
    }
  }

  // Fallback default insights if list is empty
  if (insights.length === 0) {
    insights.push("💡 Maintain consistent cruising speeds on highways to get up to 10% better fuel efficiency.");
    insights.push("💡 Regular chain lubrication every 500 km extends sprocket life and keeps riding smooth.");
  }

  const ruleBasedResults = {
    kmPerDay: parseFloat(kmPerDay.toFixed(1)),
    servicePrediction,
    fuelPrediction,
    expensePrediction,
    ridingBehavior: behavior,
    insights
  };

  const documents = await Document.find({ vehicle: vehicleId });

  // Attempt to enhance predictions with Gemini AI if key is active
  const geminiData = await generateInsightsWithGemini(
    vehicle,
    parseFloat(kmPerDay.toFixed(1)),
    fuelEntries,
    trips,
    documents,
    await Service.find({ vehicle: vehicleId }),
    ruleBasedResults
  );

  if (geminiData) {
    if (geminiData.insights && Array.isArray(geminiData.insights)) {
      ruleBasedResults.insights = geminiData.insights;
    }
    if (typeof geminiData.fuelPredictionDays === 'number') {
      ruleBasedResults.fuelPrediction.daysRemaining = geminiData.fuelPredictionDays;
      ruleBasedResults.fuelPrediction.message = geminiData.fuelPredictionDays <= 0
        ? 'You are likely running on reserve fuel. Refuel immediately!'
        : `AI predicts you will probably need fuel in ${geminiData.fuelPredictionDays} day(s) based on your riding patterns.`;
    }
    if (typeof geminiData.servicePredictionDays === 'number') {
      ruleBasedResults.servicePrediction.dueInDays = geminiData.servicePredictionDays;
      ruleBasedResults.servicePrediction.dueDate = new Date(now.getTime() + geminiData.servicePredictionDays * 24 * 60 * 60 * 1000);
      ruleBasedResults.servicePrediction.message = geminiData.servicePredictionDays <= 0
        ? 'Service is OVERDUE.'
        : `At your current riding pattern, your next service will likely be needed in ${geminiData.servicePredictionDays} days.`;
    }
    if (typeof geminiData.forecastExpense === 'number') {
      ruleBasedResults.expensePrediction.forecastExpense = geminiData.forecastExpense;
      ruleBasedResults.expensePrediction.message = `Expected fuel and vehicle expenses for this month is ₹${geminiData.forecastExpense} (Current: ₹${totalSpentThisMonth}).`;
    }
  }

  return ruleBasedResults;
};

module.exports = {
  calculateHealthScore,
  getPredictionsAndInsights
};
