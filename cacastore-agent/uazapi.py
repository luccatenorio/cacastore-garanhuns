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
    clean = "".join(filter(str.isdigit, phone or ""))
    if len(clean) in [10, 11] and not clean.startswith("55"):
        clean = "55" + clean
    return clean

def get_phone_variants(phone: str) -> set:
    """Gera variantes com e sem o 9º dígito para telefones celulares do Brasil."""
    clean = clean_phone(phone)
    variants = {clean}
    if clean.startswith("55") and len(clean) == 13 and clean[4] == "9":
        variants.add(clean[:4] + clean[5:])
    elif clean.startswith("55") and len(clean) == 12:
        variants.add(clean[:4] + "9" + clean[4:])
    return variants

def is_phone_in_whitelist(phone: str, whitelist: list) -> bool:
    """Verifica se o telefone está na whitelist considerando variações com/sem 9."""
    phone_variants = get_phone_variants(phone)
    for w in (whitelist or []):
        w_variants = get_phone_variants(w)
        if phone_variants & w_variants:
            return True
    return False

async def send_presence(phone: str, presence: str = "composing", delay_ms: int = 1200):
    """Simula digitando no WhatsApp (UazAPI v2 /message/presence)."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/message/presence"
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
    """Envia mensagem de texto via UazAPI v2 (/send/text)."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/send/text"
    payload = {
        "number": clean,
        "text": text,
        "delay": 800
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
    """Envia imagem ou mídia via UazAPI v2 (/send/media)."""
    clean = clean_phone(phone)
    url = f"{UAZAPI_SERVER_URL}/send/media"
    payload = {
        "number": clean,
        "type": "image",
        "file": media_url,
        "text": caption
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

async def mark_read(message_id: str):
    """Marca mensagem como lida na UazAPI v2 (/message/markread)."""
    if not message_id:
        return
    url = f"{UAZAPI_SERVER_URL}/message/markread"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, headers=HEADERS, json={"id": [message_id]})
    except Exception:
        pass

async def download_media_base64(message_id: str) -> str:
    """Baixa imagem ou mídia recebida em Base64 via UazAPI v2 (/message/download)."""
    if not message_id:
        return ""
    url = f"{UAZAPI_SERVER_URL}/message/download"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=HEADERS, json={
                "id": message_id,
                "return_base64": True,
                "return_link": True
            })
            if res.is_success:
                data = res.json()
                b64 = data.get("base64Data") or ""
                if len(b64) > 50:
                    return b64
    except Exception as e:
        logger.error(f"[UAZAPI] Erro ao baixar mídia {message_id}: {e}")
    return ""
