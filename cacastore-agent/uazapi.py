import httpx
import logging
from config import UAZAPI_SERVER_URL, UAZAPI_INSTANCE_TOKEN

logger = logging.getLogger(__name__)

HEADERS = {
    "token": UAZAPI_INSTANCE_TOKEN,
    "Content-Type": "application/json"
}

def clean_phone(phone: str) -> str:
    """Limpa e formata o telefone para envio no WhatsApp."""
    clean = "".join(filter(str.isdigit, phone))
    # Se começar sem o DDI 55, adiciona
    if len(clean) in [10, 11] and not clean.startswith("55"):
        clean = "55" + clean
    return clean

async def send_presence(phone: str, presence: str = "composing", delay_ms: int = 1500):
    """Simula digitando no WhatsApp para parecer 100% humano."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/message/sendPresence"
    payload = {
        "number": clean,
        "presence": presence,
        "delay": delay_ms
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, headers=HEADERS, json=payload)
    except Exception as e:
        logger.warning(f"Erro ao enviar presence para {clean}: {e}")

async def send_text(phone: str, text: str) -> bool:
    """Envia mensagem de texto via UazAPI."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/message/sendText"
    payload = {
        "number": clean,
        "text": text
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=HEADERS, json=payload)
            if res.is_success:
                logger.info(f"[UAZAPI] Texto enviado com sucesso para {clean}")
                return True
            else:
                logger.error(f"[UAZAPI] Erro ao enviar texto ({res.status_code}): {res.text}")
                return False
    except Exception as e:
        logger.error(f"[UAZAPI] Exceção ao enviar texto para {clean}: {e}")
        return False

async def send_media(phone: str, media_url: str, caption: str = "") -> bool:
    """Envia imagem ou mídia via UazAPI."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/message/sendMedia"
    payload = {
        "number": clean,
        "media": media_url,
        "caption": caption,
        "mediatype": "image"
    }
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, headers=HEADERS, json=payload)
            if res.is_success:
                logger.info(f"[UAZAPI] Mídia enviada para {clean}: {caption[:30]}")
                return True
            else:
                logger.error(f"[UAZAPI] Erro ao enviar mídia ({res.status_code}): {res.text}")
                return False
    except Exception as e:
        logger.error(f"[UAZAPI] Exceção ao enviar mídia para {clean}: {e}")
        return False

async def mark_read(phone: str):
    """Marca mensagem como lida na UazAPI."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/message/readMessage"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, headers=HEADERS, json={"number": clean})
    except Exception:
        pass
