import React from "react";
import { deviceColor, prettyDevice } from "../../config";

export function LineChart({ points, theme }) {
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
    const gridColor = isDark ? "#1c332b" : "#e2e8f0";
    const textColor = isDark ? "#8aa398" : "#64748b";

    const width = rect.width;
    const height = rect.height;
    const pad = { left: 46, right: 18, top: 20, bottom: 36 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Draw Horizontal Gridlines (Dashed)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = "11px Inter, Arial, sans-serif";
    const maxPower = Math.max(10, ...points.map((p) => Number(p.power || 0)));
    
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (chartH * i) / 5;
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(String(Math.round(maxPower * (1 - i / 5))) + " W", 4, y + 4);
    }

    if (!points.length) {
      ctx.fillStyle = textColor;
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Aucune donnée pour le moment", pad.left + 20, height / 2);
      return;
    }

    const times = points.map((p) => new Date(p.time).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(1, maxT - minT);

    // Draw Vertical Gridlines (Dashed) at 4 time steps
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

    const grouped = points.reduce((acc, point) => {
      acc[point.device] = acc[point.device] || [];
      acc[point.device].push(point);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([device, devicePoints]) => {
      const sorted = [...devicePoints].sort((a, b) => new Date(a.time) - new Date(b.time));
      if (sorted.length === 0) return;

      const getXY = (p) => {
        const x = pad.left + ((new Date(p.time).getTime() - minT) / span) * chartW;
        const y = pad.top + chartH - (Number(p.power || 0) / maxPower) * chartH;
        return { x, y };
      };

      ctx.beginPath();
      const p0 = getXY(sorted[0]);
      ctx.moveTo(p0.x, p0.y);

      if (sorted.length === 2) {
        const p1 = getXY(sorted[1]);
        ctx.lineTo(p1.x, p1.y);
      } else if (sorted.length > 2) {
        for (let i = 0; i < sorted.length - 1; i++) {
          const pStart = getXY(sorted[i]);
          const pEnd = getXY(sorted[i + 1]);
          
          // Beautiful Cubic Bezier smoothing
          const cpX1 = pStart.x + (pEnd.x - pStart.x) * 0.4;
          const cpY1 = pStart.y;
          const cpX2 = pStart.x + (pEnd.x - pStart.x) * 0.6;
          const cpY2 = pEnd.y;
          
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, pEnd.x, pEnd.y);
        }
      }

      ctx.strokeStyle = deviceColor(device);
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      
      // Subtle glowing shadow line
      ctx.shadowColor = deviceColor(device) + "33";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.stroke();
      
      // Reset shadows
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    });

    const legend = Object.keys(grouped);
    legend.slice(0, 6).forEach((device, index) => {
      const x = pad.left + index * 112;
      const y = height - 10;
      ctx.fillStyle = deviceColor(device);
      ctx.beginPath();
      ctx.arc(x + 5, y - 6, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(prettyDevice(device), x + 16, y - 3);
    });
  }, [points, theme]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
