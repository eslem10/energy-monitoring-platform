const { GoogleGenAI } = require("@google/genai");
const influxService = require("./influxService");

const fastApiChatUrl = process.env.CHATBOT_URL || "http://127.0.0.1:8000/chat";

// Helper to normalize strings for easy matching
function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
  }
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Chatbot will fall back to local rule-based responses.");
}

// Fallback logic in case API key is missing or calls fail
function fallbackProcess(message, summary) {
  const text = normalize(message);

  // 1. TIPS
  if (text.includes("tip") || text.includes("save") || text.includes("reduce") || text.includes("bill") || text.includes("econom")) {
    return `💡 **Here are my tips to reduce your electricity bill:**\n\n1. Always turn off standby appliances (they can represent up to 10% of your bill).\n2. Set your air conditioner between 24°C and 26°C.\n3. Use high-power appliances (washing machine, water heater) during off-peak hours if possible.\n4. Ensure your refrigerator door seals are in good condition.\n\nCurrently, your home is drawing **${Math.round(summary.total)} W**.`;
  }

  // 2. ANOMALIES
  if (text.includes("anomal") || text.includes("weird") || text.includes("problem") || text.includes("alert") || text.includes("issue")) {
    const activeDevices = summary.devices.filter(d => d.device !== "total" && d.power > 0);
    const highConsumers = activeDevices.filter(d => d.power > 1000);
    
    let response = "🔍 **Anomaly Analysis:**\n";
    
    if (highConsumers.length > 0) {
      response += `⚠️ Warning: High-power appliances are currently in use:\n`;
      highConsumers.forEach(d => {
        response += `- The **${d.device}** is drawing significant power (${Math.round(d.power)} W)!\n`;
      });
    } else {
      response += `✅ Everything seems normal right now. No devices are overconsuming.`;
    }
    
    if (summary.total > 3000) {
      response += `\n\n⚠️ **Global Alert**: Total power draw is very high (${Math.round(summary.total)} W). Consider turning off some appliances.`;
    }
    
    return response;
  }

  // 3. SPECIFIC DEVICE
  const devices = summary.devices.map(d => d.device).filter(d => d !== "total");
  for (const dev of devices) {
    if (text.includes(normalize(dev))) {
      const deviceData = summary.devices.find(d => d.device === dev);
      if (deviceData) {
        return `🔌 **Information for: ${dev}**\n\n- Real-time consumption: **${Math.round(deviceData.power)} W**\n- Current status: **${deviceData.status || (deviceData.power > 5 ? "ON" : "STANDBY")}**\n\nIf this seems high, you can switch it off from the Dashboard.`;
      }
    }
  }

  // 4. SUMMARY / CURRENT STATUS
  if (text.includes("summary") || text.includes("report") || text.includes("today") || text.includes("total") || text.includes("status")) {
    const activeCount = summary.devices.filter(d => d.device !== "total" && d.power > 5).length;
    
    let maxDevice = null;
    let maxVal = 0;
    summary.devices.forEach(d => {
      if (d.device !== "total" && d.power > maxVal) {
        maxVal = d.power;
        maxDevice = d.device;
      }
    });

    return `📊 **Current Consumption Summary:**\n\n- Total Power Draw: **${Math.round(summary.total)} W**\n- Active Devices: **{activeCount}**\n${maxDevice ? `- Highest Consumer: **${maxDevice}** (${Math.round(maxVal)} W)\n` : ""}\nEverything is under control! 👍`;
  }

  // 5. GENERIC QUANTITY
  if (text.includes("current") || text.includes("now") || text.includes("how much")) {
    return `Your home is currently drawing **${Math.round(summary.total)} W**.\nYou have **${summary.devices.length - 1}** registered devices.`;
  }

  // FALLBACK
  return "🤖 Hello! I am your Smart Energy Assistant.\nAsk me questions like:\n- *\"Summarize my consumption\"*\n- *\"How much is the fridge drawing?\"*\n- *\"Are there any anomalies?\"*\n- *\"How can I save energy?\"*";
}

async function processChat(message) {
  try {
    const response = await fetch(fastApiChatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: message }),
      signal: AbortSignal.timeout(35000),
    });

    if (!response.ok) {
      throw new Error(`FastAPI chatbot returned ${response.status}`);
    }

    const data = await response.json();
    const reply = String(data.response || "").trim();

    if (reply) {
      return reply;
    }

    throw new Error("FastAPI chatbot returned an empty response");
  } catch (fastApiError) {
    console.warn("FastAPI chatbot unavailable, using fallback:", fastApiError.message);
  }

  try {
    const summary = await influxService.getSummary();
    const alerts = await influxService.getAlerts({ minutes: 60 });
    const energy = await influxService.getEnergyByDevice({ minutes: 60 });

    if (!ai) {
      return fallbackProcess(message, summary);
    }

    const systemInstruction = `
You are the Smart House Energy Assistant, a helpful and polite virtual assistant connected to a real-time home energy monitoring system.
The house has the following monitored devices:
- "frigo" (Refrigerator)
- "machine_cafe" (Coffee machine)
- "laptop" (Laptop)
- "microwave" (Microwave)
- "tv" (Television)
- "total" (Total home power consumption)

Here is the current real-time state of the house:
- Summary of active devices and their current power draw:
${summary.devices.map(d => `- ${d.device}: ${Math.round(d.power)} W (Status: ${d.status})`).join("\n")}
- Total power draw: ${Math.round(summary.total)} W
- Sum of monitored devices: ${Math.round(summary.sumDevices)} W
- Alerts active in the last 60 minutes:
${alerts.length > 0 ? alerts.map(a => `[${a.level.toUpperCase()}] ${a.title} on ${a.device}: ${a.reason} (${Math.round(a.power)} W)`).join("\n") : "None"}
- Energy consumption (Wh) in the last hour:
${energy.map(e => `- ${e.device}: ${e.energyWh.toFixed(2)} Wh`).join("\n")}

Guidelines:
1. Use the real-time sensor metrics provided above to answer the user's questions about their home's energy consumption. Be precise and cite exact numbers.
2. If the user asks for tips, suggestions, or advice on how to reduce their bill or save energy, provide actionable, friendly advice.
3. Be friendly, warm, and professional. Respond in English.
4. Format your response using clean Markdown. Keep it relatively concise and easy to read.
`;

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    if (response && response.text) {
      return response.text.trim();
    } else {
      throw new Error("Empty response from Gemini API");
    }

  } catch (error) {
    console.error("Chatbot Gemini error, using fallback:", error);
    try {
      const summary = await influxService.getSummary();
      return fallbackProcess(message, summary) + "\n\n*(Note: An error occurred with the AI model, this response was automatically generated by the fallback system.)*";
    } catch (fallbackError) {
      return "Sorry, I was unable to retrieve real-time data.";
    }
  }
}

module.exports = {
  processChat,
};
