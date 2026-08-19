const influxService = require("./influxService");
const appStateService = require("./appStateService");

// This is an estimate, not an official STEG invoice.  The tariff stays in the
// dashboard settings so it can be updated without a deployment.
async function getEstimate() {
  const [dailyStats, settings] = await Promise.all([
    influxService.getDailyStats(),
    appStateService.readState().settings,
  ]);
  const tariffTndPerKwh = Math.max(0, Number(settings.tariffTndPerKwh || 0));
  const usedKwhToday = Number(dailyStats.todayWh || 0) / 1000;
  const projectedKwhMonth = usedKwhToday * 30;
  const energyCostTnd = projectedKwhMonth * tariffTndPerKwh;
  const vatRate = 0.19;
  const vatTnd = energyCostTnd * vatRate;

  return {
    label: "Estimated monthly electricity cost",
    isOfficialInvoice: false,
    tariffTndPerKwh,
    usedKwhToday,
    projectedKwhMonth,
    energyCostTnd,
    vatRate,
    vatTnd,
    totalTnd: energyCostTnd + vatTnd,
    basedOn: "last_24h_projection",
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getEstimate };
