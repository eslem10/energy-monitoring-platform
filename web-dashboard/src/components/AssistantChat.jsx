import React from "react";
import { API_URL } from "../config";

export function AssistantChat() {
  const [messages, setMessages] = React.useState([
    {
      role: "assistant",
      text: "Hello! I am your Smart House Energy Assistant. Ask me anything about your current consumption, active devices, or how to save energy.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const suggestions = [
    "What is my current consumption?",
    "Show me energy saving tips.",
    "Are there any active alerts?",
    "Which device consumes the most?"
  ];

  async function sendMessage(textToSend) {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput("");
    setLoading(true);
    
    // Add user message and temporary assistant thinking bubble
    setMessages((current) => [
      ...current,
      { role: "user", text: prompt },
      { role: "assistant", text: "Thinking..." },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText = String(data.response || "").trim();

      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "assistant",
          text: assistantText || "Received an empty response from the assistant.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "assistant",
          text: "Sorry, I am unable to connect to the backend server. Please verify the Node API is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel panel-pad" style={{ maxWidth: 800, margin: "24px auto", display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: "500px" }}>
      <div className="section-head" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "28px" }}>🤖</div>
          <div>
            <h2 style={{ margin: 0 }}>Smart Energy Assistant</h2>
            <span className="muted" style={{ fontSize: "12px" }}>Powered by Gemini AI & Real-time Telemetry</span>
          </div>
        </div>
        <span className="status-pill" style={{ fontSize: "12px", padding: "6px 12px" }}>
          <span className="dot" /> {loading ? "Thinking..." : "Ready"}
        </span>
      </div>

      {/* Messages viewport */}
      <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "8px", marginBottom: "16px" }}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              display: "flex",
              gap: "10px",
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
              flexDirection: message.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: message.role === "user" ? "var(--green)" : "var(--line)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                flexShrink: 0,
              }}
            >
              {message.role === "user" ? "👤" : "🤖"}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: message.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: message.role === "user" ? "linear-gradient(135deg, #087b54, #16bf76)" : "var(--card-sub-bg)",
                color: message.role === "user" ? "white" : "var(--ink)",
                border: message.role === "user" ? "none" : "1px solid var(--line)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                fontSize: "14px",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={loading}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "20px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "800",
                color: "var(--muted)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "var(--green)";
                e.target.style.color = "var(--green)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "var(--line)";
                e.target.style.color = "var(--muted)";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input panel */}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question about your home energy consumption..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 18px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            background: "var(--input-bg)",
            color: "var(--ink)",
            fontSize: "14px",
            outline: "none",
            transition: "all 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
        />
        <button
          className="btn-submit"
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "0 24px",
            borderRadius: "14px",
            fontWeight: "800",
            background: "linear-gradient(135deg, #087b54, #16bf76)",
            color: "white",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </section>
  );
}
