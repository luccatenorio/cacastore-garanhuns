import httpx
import logging
import asyncio
import re
from typing import Dict, Any, List
from supabase import create_client, Client
from config import (
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    SUPABASE_URL,
    SUPABASE_KEY
)
import uazapi
import inventory
from prompt import SYSTEM_PROMPT

logger = logging.getLogger(__name__)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

async def call_openrouter(messages: List[Dict[str, str]]) -> str:
    """Chama a OpenRouter API para obter a resposta da IA."""
    if not OPENROUTER_API_KEY:
        logger.error("[OPENROUTER] API Key não configurada!")
        return "Olá! Sou a Cacá da CaçaStore. Um minutinho que já vou te atender!"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://cacastore-garanhuns.vercel.app",
        "X-Title": "CacaStore AI Sales Agent",
        "Content-Type": "application/json"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(OPENROUTER_ENDPOINT, headers=headers, json=payload)
            if res.is_success:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"[OPENROUTER] Erro ({res.status_code}): {res.text}")
                return "Oie! Aqui é a Cacá da CaçaStore 💕 Já estou te atendendo!"
    except Exception as e:
        logger.error(f"[OPENROUTER] Exceção na requisição: {e}")
        return "Oie! Aqui é a Cacá 💕 Já te respondo em um instante!"

def extract_size_from_text(text: str) -> str:
    """Detecta tamanho mencionado no texto (P, M, G, GG)."""
    t = text.lower()
    if re.search(r'\b(tamanho\s*p|visto\s*p|quero\s*p|\bp\b)\b', t):
        return "P"
    if re.search(r'\b(tamanho\s*m|visto\s*m|quero\s*m|\bm\b)\b', t):
        return "M"
    if re.search(r'\b(tamanho\s*g|visto\s*g|quero\s*g|\bg\b)\b', t):
        return "G"
    if re.search(r'\b(tamanho\s*gg|visto\s*gg|quero\s*gg|\bgg\b)\b', t):
        return "GG"
    return ""

async def process_incoming_message(phone: str, text: str, sender_name: str = ""):
    """Processa mensagem recebida de um lead do WhatsApp."""
    clean_phone = uazapi.clean_phone(phone)
    logger.info(f"[PROCESS] Mensagem recebida de {clean_phone}: {text[:50]}")

    # 1. Carrega configurações do agente
    settings = inventory.get_settings()
    if not settings.get("is_active", True):
        logger.info("[AGENT] Agente desativado globalmente nas configurações.")
        return

    # 2. Modo de Teste / Whitelist
    test_mode = settings.get("test_mode", True)
    whitelist = [uazapi.clean_phone(p) for p in (settings.get("whitelist_phones") or [])]
    if test_mode and clean_phone not in whitelist:
        logger.info(f"[AGENT] Modo de Teste ativo: {clean_phone} não está na whitelist ({whitelist}). Mensagem ignorada pela IA.")
        return

    # 3. Busca ou cria o lead no Supabase
    lead_res = supabase.from_("caca_agent_leads").select("*").eq("phone", clean_phone).execute()
    lead = lead_res.data[0] if lead_res.data else None

    if not lead:
        new_lead = {
            "phone": clean_phone,
            "name": sender_name or "Cliente",
            "status": "novo",
            "is_ai_paused": False,
            "total_amount": settings.get("combo_price", 200.00)
        }
        ins = supabase.from_("caca_agent_leads").insert(new_lead).execute()
        lead = ins.data[0] if ins.data else new_lead
    elif lead.get("is_ai_paused"):
        logger.info(f"[AGENT] IA pausada para o lead {clean_phone} (atendimento humano assumido).")
        # Salva a mensagem no histórico mesmo assim
        supabase.from_("caca_agent_messages").insert({
            "lead_phone": clean_phone,
            "sender": "cliente",
            "content": text
        }).execute()
        return

    # 4. Salva a mensagem do cliente no banco
    supabase.from_("caca_agent_messages").insert({
        "lead_phone": clean_phone,
        "sender": "cliente",
        "content": text
    }).execute()

    # 5. Marca como lida e simula digitando
    await uazapi.mark_read(clean_phone)
    await uazapi.send_presence(clean_phone, "composing", 2000)

    # 6. Carrega histórico de mensagens para a IA
    hist_res = supabase.from_("caca_agent_messages").select("sender, content").eq("lead_phone", clean_phone).order("created_at", desc=False).limit(20).execute()
    history = hist_res.data or []

    # 7. Formata prompt do sistema com a Chave Pix atual
    pix_key = settings.get("pix_key") or "suachavepix@cacastore.com.br"
    custom_system_prompt = SYSTEM_PROMPT.replace("{PIX_KEY}", pix_key)

    # 8. Detecta se a cliente pediu um tamanho específico
    detected_size = extract_size_from_text(text)
    if detected_size and not lead.get("size"):
        supabase.from_("caca_agent_leads").update({"size": detected_size, "updated_at": "now()"}).eq("phone", clean_phone).execute()
        lead["size"] = detected_size

    # Monta array de mensagens para a LLM
    llm_messages = [{"role": "system", "content": custom_system_prompt}]
    for m in history:
        role = "assistant" if m.get("sender") == "agente_ia" else "user"
        llm_messages.append({"role": role, "content": m.get("content", "")})

    # 9. Chama a inteligência artificial
    ai_response = await call_openrouter(llm_messages)

    # 10. Processa tags de controle da resposta da IA
    new_status = lead.get("status", "em_atendimento")
    pause_ai = False

    if "[TRANSBORDO_HUMANO]" in ai_response:
        new_status = "aguardando_humano"
        pause_ai = True
        logger.info(f"[AGENT] Lead {clean_phone} transferido para atendimento humano (Cartão/Dúvida)!")
    elif "[PAGAMENTO_CONFIRMADO]" in ai_response:
        new_status = "pago"
    elif "[AGUARDANDO_PAGAMENTO]" in ai_response:
        new_status = "aguardando_pagamento"
    else:
        new_status = "em_atendimento"

    # Remove as tags antes de enviar para o cliente
    cleaned_reply = ai_response.replace("[TRANSBORDO_HUMANO]", "")\
                               .replace("[PAGAMENTO_CONFIRMADO]", "")\
                               .replace("[AGUARDANDO_PAGAMENTO]", "").strip()

    # 11. Se um tamanho foi informado agora, dispara as fotos dos modelos em estoque!
    if detected_size:
        combo_models = inventory.get_combo_models(detected_size)
        logger.info(f"[AGENT] Enviando {len(combo_models)} fotos do tamanho {detected_size} para {clean_phone}")
        
        # Envia primeiro o texto da IA
        await uazapi.send_text(clean_phone, cleaned_reply)
        await asyncio.sleep(1.0)

        # Envia até 6 fotos com as legendas dos modelos
        for item in combo_models[:6]:
            cap = f"✨ {item['name']} (Tam: {detected_size}) - Participa do Combo 2 por R$ 200"
            await uazapi.send_media(clean_phone, item["image"], cap)
            await asyncio.sleep(1.2)
    else:
        # Envia apenas a mensagem de texto normal
        await uazapi.send_text(clean_phone, cleaned_reply)

    # 12. Salva a resposta da IA e atualiza o status do lead no Supabase
    supabase.from_("caca_agent_messages").insert({
        "lead_phone": clean_phone,
        "sender": "agente_ia",
        "content": cleaned_reply
    }).execute()

    supabase.from_("caca_agent_leads").update({
        "status": new_status,
        "is_ai_paused": pause_ai,
        "updated_at": "now()"
    }).eq("phone", clean_phone).execute()
