import React from "react";

export function BudgetCard({ monthlyCost, monthlyBudget }) {
  const percent = Math.min(100, Math.round((monthlyCost / Math.max(1, monthlyBudget)) * 100));
  let color = "var(--green)";
  let statusText = "Budget sous contrôle";

  if (percent >= 90) {
    color = "var(--red)";
    statusText = "⚠ DÉPASSEMENT IMMINENT / ATTEINT";
  } else if (percent >= 70) {
    color = "var(--amber)";
    statusText = "Attention, 70%+ consommé";
  }

  return (
    <div className="panel panel-pad">
      <div className="section-head" style={{ marginBottom: "6px" }}>
        <h2>🎯 Budget Électricité Mensuel</h2>
        <span className="muted" style={{ fontWeight: 800, color }}>{statusText}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "10px" }}>
        <strong style={{ fontSize: "28px" }}>{monthlyCost.toFixed(2)} TND</strong>
        <span className="muted" style={{ fontWeight: 800 }}>/ Objectif {monthlyBudget} TND ({percent}%)</span>
      </div>
      <div className="budget-progress-shell">
        <div className="budget-progress-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
        Projection mensuelle basée sur le tarif de 0.250 TND / kWh
      </p>
    </div>
  );
}
