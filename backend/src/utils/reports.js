/**
 * Helper to escape special characters for CSV formatting
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 * Converts fuel entries to a CSV string
 */
const generateFuelCSV = (entries) => {
  const headers = [
    'Date', 
    'Odometer (km)', 
    'Fuel Volume (L)', 
    'Price/Liter (₹)', 
    'Total Cost (₹)', 
    'Calculated Mileage (km/L)', 
    'Station', 
    'Location', 
    'Partial Fill', 
    'Missed Previous Fill', 
    'Notes'
  ];
  const rows = entries.map(e => [
    new Date(e.date).toLocaleDateString(),
    e.odometer,
    e.liters,
    e.pricePerLiter,
    e.totalCost,
    e.mileage !== null && e.mileage !== undefined ? e.mileage : 'N/A',
    e.fuelStation || '',
    e.location || '',
    e.partialFill ? 'Yes' : 'No',
    e.missedPreviousFill ? 'Yes' : 'No',
    e.notes || ''
  ]);
  
  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
};

/**
 * Converts expense entries to a CSV string
 */
const generateExpenseCSV = (expenses) => {
  const headers = ['Date', 'Category', 'Amount (₹)', 'Odometer (km)', 'Notes'];
  const rows = expenses.map(e => [
    new Date(e.date).toLocaleDateString(),
    e.category,
    e.amount,
    e.odometer || 'N/A',
    e.notes || ''
  ]);
  
  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
};

/**
 * Converts service records to a CSV string
 */
const generateServiceCSV = (services) => {
  const headers = [
    'Date', 
    'Odometer (km)', 
    'Service Type', 
    'Cost (₹)', 
    'Service Provider', 
    'Description', 
    'Next Service Odo (km)', 
    'Next Service Date'
  ];
  const rows = services.map(s => [
    new Date(s.date).toLocaleDateString(),
    s.odometer,
    s.type,
    s.cost,
    s.serviceProvider || '',
    s.description || '',
    s.nextServiceOdometer || 'N/A',
    s.nextServiceDate ? new Date(s.nextServiceDate).toLocaleDateString() : 'N/A'
  ]);
  
  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
};

/**
 * Converts completed/running trips to a CSV string
 */
const generateTripCSV = (trips) => {
  const headers = [
    'Start Date', 
    'End Date', 
    'Purpose', 
    'Start Odometer (km)', 
    'End Odometer (km)', 
    'Distance (km)', 
    'Duration (min)', 
    'Start Location', 
    'End Location', 
    'Ride Score', 
    'Notes'
  ];
  const rows = trips.map(t => [
    new Date(t.startDate).toLocaleString(),
    t.endDate ? new Date(t.endDate).toLocaleString() : 'Running',
    t.purpose,
    t.startOdometer,
    t.endOdometer || 'Running',
    t.distance !== null && t.distance !== undefined ? t.distance : 'Running',
    t.duration !== null && t.duration !== undefined ? t.duration : 'Running',
    t.startLocation || '',
    t.endLocation || '',
    t.rideScore !== null && t.rideScore !== undefined ? t.rideScore : 'N/A',
    t.notes || ''
  ]);
  
  return [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
};

module.exports = {
  generateFuelCSV,
  generateExpenseCSV,
  generateServiceCSV,
  generateTripCSV,
};
