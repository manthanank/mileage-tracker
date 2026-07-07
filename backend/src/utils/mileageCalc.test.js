const assert = require('assert');
const FuelEntry = require('../models/FuelEntry');
const { recalculateMileage } = require('./mileageCalc');

// Simple mocking of FuelEntry
let mockEntries = [];

FuelEntry.find = () => {
  return {
    sort: () => {
      return Promise.resolve(mockEntries);
    }
  };
};

const runTests = async () => {
  console.log('--- Running Mileage Calculator Unit Tests ---');

  try {
    // ----------------------------------------------------
    // Test Case 1: Sequential Full Fills
    // ----------------------------------------------------
    console.log('Test Case 1: Sequential Full Fills...');
    mockEntries = [
      {
        odometer: 1000,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 1350,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 1750,
        liters: 12.5,
        pricePerLiter: 100,
        totalCost: 1250,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      }
    ];

    await recalculateMileage('dummy-vehicle-id');

    // Expectations:
    // Entry 0: first full fill baseline -> mileage is null
    // Entry 1: distance = 350km, liters = 10L -> mileage = 35.0 km/L
    // Entry 2: distance = 400km, liters = 12.5L -> mileage = 32.0 km/L
    assert.strictEqual(mockEntries[0].mileage, null, 'First entry mileage should be null');
    assert.strictEqual(mockEntries[1].mileage, 35, 'Second entry mileage should be 35 km/L');
    assert.strictEqual(mockEntries[2].mileage, 32, 'Third entry mileage should be 32 km/L');
    console.log('✔ Case 1 Passed!');

    // ----------------------------------------------------
    // Test Case 2: Intermediate Partial Fills
    // ----------------------------------------------------
    console.log('Test Case 2: Intermediate Partial Fills...');
    mockEntries = [
      {
        odometer: 2000,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 2200,
        liters: 5, // Partial fill
        pricePerLiter: 100,
        totalCost: 500,
        partialFill: true,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 2400,
        liters: 5, // Partial fill
        pricePerLiter: 100,
        totalCost: 500,
        partialFill: true,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 2600,
        liters: 10, // Full fill
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      }
    ];

    await recalculateMileage('dummy-vehicle-id');

    // Expectations:
    // Entry 0: baseline -> null
    // Entry 1: partial -> null (liters 5 accumulated)
    // Entry 2: partial -> null (liters 5 accumulated, running = 10)
    // Entry 3: full -> distance = 600km, liters = 10 + 10 = 20L -> mileage = 600 / 20 = 30.0 km/L
    assert.strictEqual(mockEntries[0].mileage, null);
    assert.strictEqual(mockEntries[1].mileage, null);
    assert.strictEqual(mockEntries[2].mileage, null);
    assert.strictEqual(mockEntries[3].mileage, 30, 'Full fill after partial fills should be 30 km/L');
    console.log('✔ Case 2 Passed!');

    // ----------------------------------------------------
    // Test Case 3: Missed Previous Fill Resets Baseline
    // ----------------------------------------------------
    console.log('Test Case 3: Missed Previous Fill Resetting Baseline...');
    mockEntries = [
      {
        odometer: 3000,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 3300,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 3700,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: true, // Missed previous fill log!
        mileage: null,
        save: function() { return this; }
      },
      {
        odometer: 4000,
        liters: 10,
        pricePerLiter: 100,
        totalCost: 1000,
        partialFill: false,
        missedPreviousFill: false,
        mileage: null,
        save: function() { return this; }
      }
    ];

    await recalculateMileage('dummy-vehicle-id');

    // Expectations:
    // Entry 0: baseline -> null
    // Entry 1: normal full -> 300km / 10L = 30 km/L
    // Entry 2: missed prev fill -> null (breaks the chain, acts as new baseline)
    // Entry 3: normal full -> distance = 300km (from entry 2 odo), liters = 10L -> 30 km/L
    assert.strictEqual(mockEntries[0].mileage, null);
    assert.strictEqual(mockEntries[1].mileage, 30);
    assert.strictEqual(mockEntries[2].mileage, null, 'Missed entry mileage should be null');
    assert.strictEqual(mockEntries[3].mileage, 30, 'Entry after missed fill should calculate using missed fill as baseline');
    console.log('✔ Case 3 Passed!');

    console.log('\n⭐⭐⭐ All Mileage Calculator Unit Tests Passed Successfully! ⭐⭐⭐');
    process.exit(0);

  } catch (error) {
    console.error('❌ Unit Test Failure:', error.message);
    process.exit(1);
  }
};

runTests();
