from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from query_engine import build_context

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    prompt: str

@app.post("/chat")
def chat(message: Message):
    context = build_context(message.prompt)

    print("=== CONTEXT ===")
    print(context)
    print("===============")

    full_prompt = f"""Voici des donnees mesurees reelles:

{context}

En te basant UNIQUEMENT sur les chiffres ci-dessus (pas tes connaissances generales), reponds a: {message.prompt}

Reponds en une phrase courte avec le chiffre exact."""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": full_prompt}]
        }
    )
    return {"response": response.json()["choices"][0]["message"]["content"]}

@app.get("/")
def home():
    return {"status": "Chatbot API khedma!"}