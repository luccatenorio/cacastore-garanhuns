import logging
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from agent import process_incoming_message
import inventory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cacastore-agent")

app = FastAPI(title="CaçaStore AI Sales Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "CaçaStore AI Sales Agent",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    settings = inventory.get_settings()
    return {
        "status": "ok",
        "service": "CaçaStore AI Sales Agent",
        "is_active": settings.get("is_active", True),
        "test_mode": settings.get("test_mode", True)
    }

@app.get("/api/settings")
def get_settings():
    return inventory.get_settings()

@app.post("/webhook")
async def handle_uazapi_webhook(request: Request, background_tasks: BackgroundTasks):
    """Webhook receptor de eventos e mensagens da UazAPI."""
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"[WEBHOOK] Erro ao ler JSON do webhook: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    # Extração robusta de campos do payload da UazAPI
    event = payload.get("event") or payload.get("type") or ""
    data = payload.get("data") or payload

    # Se for mensagem enviada por mim ou grupo, ignora
    key = data.get("key") or {}
    from_me = key.get("fromMe", False) or data.get("fromMe", False)
    if from_me:
        return {"status": "ignored", "reason": "fromMe"}

    remote_jid = key.get("remoteJid") or data.get("chatid") or data.get("remoteJid") or ""
    if "@g.us" in remote_jid or "status@broadcast" in remote_jid:
        return {"status": "ignored", "reason": "group_or_status"}

    # Extrair telefone
    phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
    if not phone:
        return {"status": "ignored", "reason": "no_phone"}

    # Extrair texto da mensagem
    msg_obj = data.get("message") or {}
    text = ""
    if isinstance(msg_obj, str):
        text = msg_obj
    elif isinstance(msg_obj, dict):
        text = msg_obj.get("conversation") or \
               msg_obj.get("extendedTextMessage", {}).get("text") or \
               msg_obj.get("imageMessage", {}).get("caption") or \
               data.get("body") or data.get("text") or ""
    else:
        text = data.get("body") or data.get("text") or ""

    text = (text or "").strip()
    if not text:
        return {"status": "ignored", "reason": "empty_text"}

    sender_name = data.get("pushName") or data.get("name") or "Cliente"

    # Envia processamento para segundo plano para responder rápido à UazAPI (HTTP 200)
    background_tasks.add_task(process_incoming_message, phone, text, sender_name)

    return {"status": "processing", "phone": phone}
