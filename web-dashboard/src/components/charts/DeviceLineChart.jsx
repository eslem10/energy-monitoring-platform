import React from "react";
import { formatPower } from "../../config";

export function DeviceLineChart({ points, color, theme }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const isDark = theme === "dark";
    const gridColor = isDark ? "#1c332b" : "#f1f5f9";
    const textColor = isDark ? "#8aa398" : "#64748b";

    const width = rect.width;
    const height = rect.height;
    const pad = { left: 56, right: 24, top: 20, bottom: 32 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    if (!points || !points.length) {
      ctx.fillStyle = textColor;
      ctx.font = "13px Inter, sans-serif";
      ctx.fillText("Aucune donnée enregistrée pour cette période", pad.left, height / 2);
      return;
    }

    const powers = points.map((p) => Number(p.power || 0));
    const maxP = Math.max(10, ...powers);

    // Horizontal Gridlines (Dashed)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = "11px Inter, sans-serif";
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH * i) / 4;
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(formatPower(maxP * (1 - i / 4)), 4, y + 4);
    }

    const times = points.map((p) => new Date(p.time).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(1, maxT - minT);

    // Vertical Gridlines (Dashed)
    for (let i = 1; i < 4; i++) {
      const x = pad.left + (chartW * i) / 4;
      ctx.beginPath();
      ctx.strokeStyle = gridColor;
      ctx.setLineDash([4, 6]);
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const sorted = [...points].sort((a, b) => new Date(a.time) - new Date(b.time));

    const grad = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    grad.addColorStop(0, `${color}44`);
    grad.addColorStop(0.5, `${color}15`);
    grad.addColorStop(1, `${color}00`);

    const getXY = (p) => {
      const x = pad.left + ((new Date(p.time).getTime() - minT) / span) * chartW;
      const y = pad.top + chartH - (Number(p.power || 0) / maxP) * chartH;
      return { x, y };
    };

    const traceCurve = (c) => {
      const p0 = getXY(sorted[0]);
      c.moveTo(p0.x, p0.y);
      
      if (sorted.length === 2) {
        const p1 = getXY(sorted[1]);
        c.lineTo(p1.x, p1.y);
      } else if (sorted.length > 2) {
        for (let i = 0; i < sorted.length - 1; i++) {
          const pStart = getXY(sorted[i]);
          const pEnd = getXY(sorted[i + 1]);
          
          const cpX1 = pStart.x + (pEnd.x - pStart.x) * 0.4;
          const cpY1 = pStart.y;
          const cpX2 = pStart.x + (pEnd.x - pStart.x) * 0.6;
          const cpY2 = pEnd.y;
          
          c.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pEnd.x, pEnd.y);
        }
      }
    };

    // Draw Fill Area
    ctx.beginPath();
    traceCurve(ctx);
    const firstX = getXY(sorted[0]).x;
    const lastX = getXY(sorted[sorted.length - 1]).x;
    ctx.lineTo(lastX, pad.top + chartH);
    ctx.lineTo(firstX, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Stroke with Drop Shadow
    ctx.beginPath();
    traceCurve(ctx);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    
    ctx.shadowColor = color + "44";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.stroke();

    // Reset Shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw Uptime Last Point Node
    const lastP = sorted[sorted.length - 1];
    const { x: lx, y: ly } = getXY(lastP);
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isDark ? "#13221c" : "#ffffff";
    ctx.stroke();

  }, [points, color, theme]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
