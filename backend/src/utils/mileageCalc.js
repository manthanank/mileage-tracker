const FuelEntry = require('../models/FuelEntry');

/**
 * Recalculates and updates the mileage values for all fuel entries of a specific vehicle.
 * Sorted by odometer ascending.
 * 
 * Algorithm:
 * - We track the last "Full Fill" entry.
 * - Any "Partial Fill" entry is not given a mileage directly. Instead, we accumulate its liters.
 * - When we reach the next "Full Fill" entry:
 *   - Distance = currentOdometer - lastFullFillOdometer
 *   - Liters = currentLiters + accumulatedLiters (from intermediate partial fills)
 *   - Mileage = Distance / Liters
 *   - If the current entry has "missedPreviousFill" = true, we reset the accumulated liters
 *     and cannot calculate mileage for this entry (since the chain is broken), but it becomes
 *     the new baseline "lastFullFill" for future runs.
 * 
 * @param {string} vehicleId - The ID of the vehicle
 */
const recalculateMileage = async (vehicleId) => {
  // Fetch all entries sorted by odometer ascending
  const entries = await FuelEntry.find({ vehicle: vehicleId }).sort({ odometer: 1 });

  let lastFullFillEntry = null;
  let accumulatedLiters = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let calculatedMileage = null;

    if (entry.partialFill) {
      // Partial fill: accumulate liters, cannot calculate mileage yet
      accumulatedLiters += entry.liters;
      calculatedMileage = null;
    } else {
      // Full fill
      if (entry.missedPreviousFill) {
        // Missed previous fill: chain is broken, reset baseline
        calculatedMileage = null;
        accumulatedLiters = 0;
        lastFullFillEntry = entry;
      } else {
        if (lastFullFillEntry) {
          const distance = entry.odometer - lastFullFillEntry.odometer;
          const totalLiters = entry.liters + accumulatedLiters;
          
          if (distance > 0 && totalLiters > 0) {
            calculatedMileage = parseFloat((distance / totalLiters).toFixed(2));
          }
        }
        
        // Reset accumulator and update baseline
        accumulatedLiters = 0;
        lastFullFillEntry = entry;
      }
    }

    // Only save if mileage value has changed to reduce DB writes
    if (entry.mileage !== calculatedMileage) {
      entry.mileage = calculatedMileage;
      await entry.save();
    }
  }
};

module.exports = {
  recalculateMileage,
};
