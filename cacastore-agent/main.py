import logging
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from agent import process_incoming_message
import inventory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cacastore-agent")

app = FastAPI(title="CaçaStore AI Sales Agent", version="2.0.0")

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
        "service": "CaçaStore AI Sales Agent (Vision v2)",
        "version": "2.0.0"
    }

@app.get("/health")
def health_check():
    settings = inventory.get_settings()
    return {
        "status": "ok",
        "service": "CaçaStore AI Sales Agent (Vision v2)",
        "is_active": settings.get("is_active", True),
        "test_mode": settings.get("test_mode", True),
        "has_ai_key": bool(settings.get("openrouter_api_key"))
    }

@app.get("/api/settings")
def get_settings():
    return inventory.get_settings()

@app.post("/webhook")
async def handle_uazapi_webhook(request: Request, background_tasks: BackgroundTasks):
    """Webhook receptor universal de eventos e mensagens da UazAPI v2 (com suporte a imagens e anúncios)."""
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"[WEBHOOK] Erro ao ler JSON do webhook: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    msg_obj = payload.get("message") if isinstance(payload.get("message"), dict) else (
        payload.get("data") if isinstance(payload.get("data"), dict) else payload
    )
    chat_obj = payload.get("chat") if isinstance(payload.get("chat"), dict) else {}
    key_obj = msg_obj.get("key") if isinstance(msg_obj.get("key"), dict) else {}

    from_me = bool(msg_obj.get("fromMe") or key_obj.get("fromMe") or payload.get("fromMe"))
    if from_me:
        return {"status": "ignored", "reason": "fromMe"}

    is_group = bool(msg_obj.get("isGroup") or chat_obj.get("wa_isGroup"))
    remote_jid = str(msg_obj.get("chatid") or key_obj.get("remoteJid") or msg_obj.get("remoteJid") or chat_obj.get("wa_chatid") or "")
    if is_group or "@g.us" in remote_jid or "status@broadcast" in remote_jid:
        return {"status": "ignored", "reason": "group_or_status"}

    phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
    if not phone:
        return {"status": "ignored", "reason": "no_phone"}

    message_type = str(msg_obj.get("messageType") or msg_obj.get("type") or "Conversation")
    message_id = str(msg_obj.get("messageid") or msg_obj.get("id") or key_obj.get("id") or "")
    sender_name = str(msg_obj.get("senderName") or msg_obj.get("pushName") or chat_obj.get("name") or "Cliente")

    content_obj = msg_obj.get("content") if isinstance(msg_obj.get("content"), dict) else {}
    context_info = content_obj.get("contextInfo") if isinstance(content_obj.get("contextInfo"), dict) else {}
    external_ad = context_info.get("externalAdReply") if isinstance(context_info.get("externalAdReply"), dict) else None
    quoted_msg = context_info.get("quotedMessage") if isinstance(context_info.get("quotedMessage"), dict) else None

    text = str(
        msg_obj.get("text") or
        content_obj.get("text") or
        content_obj.get("caption") or
        msg_obj.get("body") or
        ""
    ).strip()

    image_base64 = str(content_obj.get("JPEGThumbnail") or "")
    quoted_caption = ""
    if quoted_msg:
        q_img = quoted_msg.get("imageMessage") if isinstance(quoted_msg.get("imageMessage"), dict) else {}
        quoted_caption = str(q_img.get("caption") or quoted_msg.get("conversation") or quoted_msg.get("text") or "")

    is_from_ad = bool(external_ad or context_info.get("conversionSource") == "FB_Ads" or context_info.get("entryPointConversionApp") == "instagram")
    is_image_msg = "image" in message_type.lower()

    if not text and not is_image_msg and not image_base64:
        return {"status": "ignored", "reason": "empty_text_and_no_image"}

    background_tasks.add_task(
        process_incoming_message,
        phone=phone,
        text=text,
        sender_name=sender_name,
        message_id=message_id,
        message_type=message_type,
        image_base64=image_base64,
        quoted_caption=quoted_caption,
        is_from_ad=is_from_ad
    )

    return {"status": "processing", "phone": phone}
