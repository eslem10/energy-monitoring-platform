import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from query_engine import build_context

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Message(BaseModel):
    prompt: str
    realtime_context: str = ""


@app.post("/history-context")
def history_context(message: Message):
    """Returns computed historical facts only; it does not require an AI key."""
    return {"context": build_context(message.prompt)}


@app.post("/chat")
def chat(message: Message):
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY is not configured"}

    historical_context = build_context(message.prompt)
    full_prompt = f"""Historical statistics calculated from archived measurement files:
{historical_context}

Real-time metrics, queried just now from InfluxDB:
{message.realtime_context or 'No real-time metrics are available.'}

Answer this question: {message.prompt}
Never invent a number. Clearly distinguish historical statistics from real-time values, and keep the answer concise."""
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": full_prompt}]},
        timeout=30,
    )
    if not response.ok:
        return {"error": f"Groq API returned {response.status_code}"}
    reply = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    return {"response": reply} if reply else {"error": "Groq API returned an empty response"}


@app.get("/")
def home():
    return {"status": "Chatbot API ready"}
