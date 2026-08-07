import React from "react";

export function WeeklyBarChart({ data, theme }) {
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
    const textColor = isDark ? "#8aa398" : "#65746f";
    const gridColor = isDark ? "#1c332b" : "#dce8e3";
    const barActive = isDark ? "#10d07e" : "#16bf76";
    const barMuted = isDark ? "#1a3a2e" : "#d1efe0";

    const pad = { left: 40, right: 10, top: 20, bottom: 30 };
    const chartW = rect.width - pad.left - pad.right;
    const chartH = rect.height - pad.top - pad.bottom;

    const maxVal = Math.max(1, ...data.map((d) => d.value));

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = "11px Arial";
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(rect.width - pad.right, y);
      ctx.stroke();
      const val = maxVal * (1 - i / 4);
      ctx.fillText((val / 1000).toFixed(1) + "k", 4, y + 4);
    }

    const barW = Math.min(30, chartW / data.length - 10);
    const spacing = (chartW - barW * data.length) / (data.length + 1);

    data.forEach((d, i) => {
      const h = (d.value / maxVal) * chartH;
      const x = pad.left + spacing + i * (barW + spacing);
      const y = pad.top + chartH - h;

      ctx.fillStyle = d.isToday ? barActive : barMuted;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, h, [6, 6, 0, 0]);
      } else {
        ctx.rect(x, y, barW, h); // Fallback for older browsers
      }
      ctx.fill();

      ctx.fillStyle = d.isToday ? (isDark ? "#e8f5f0" : "#10221a") : textColor;
      ctx.font = d.isToday ? "bold 11px Arial" : "11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(d.label, x + barW / 2, rect.height - 10);
    });
  }, [data, theme]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
