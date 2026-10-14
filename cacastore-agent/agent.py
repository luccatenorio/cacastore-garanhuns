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

async def call_openrouter(messages: List[Dict[str, str]], api_key: str = "", model: str = "") -> str:
    """Chama a OpenRouter API para obter a resposta da IA."""
    chosen_key = api_key or OPENROUTER_API_KEY
    chosen_model = model or OPENROUTER_MODEL or "openai/gpt-4o-mini"

    if not chosen_key:
        logger.info("[OPENROUTER] API Key não configurada. Usando motor nativo de script da Cacá.")
        return ""

    headers = {
        "Authorization": f"Bearer {chosen_key}",
        "HTTP-Referer": "https://cacastore-garanhuns.vercel.app",
        "X-Title": "CacaStore AI Sales Agent",
        "Content-Type": "application/json"
    }

    payload = {
        "model": chosen_model,
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
                return ""
    except Exception as e:
        logger.error(f"[OPENROUTER] Exceção na requisição: {e}")
        return ""

def generate_fallback_response(history: List[Dict[str, str]], text: str, detected_size: str, settings: Dict[str, Any]) -> str:
    """Motor de resposta nativo calibrado no estilo real da Cacá quando não houver LLM configurada."""
    t = text.lower()
    pix_key = settings.get("pix_key") or "12.345.678/0001-90"
    combo_price = settings.get("combo_price", 200.0)

    # 1. Transbordo Humano para Cartão de Crédito ou Parcelamento
    if any(k in t for k in ["cartao", "cartão", "credito", "crédito", "link", "parcelar", "vezes", "parcela", "maquininha"]):
        return "Perfeito! Já chamei a equipe aqui pra te mandar o link de pagamento no cartão com toda segurança. Só um momentinho que já te mandam por aqui! 💕 [TRANSBORDO_HUMANO]"

    # 2. Pagamento / Pix
    if any(k in t for k in ["pix", "chave", "pagamento", "pagar", "como pago", "qual a chave"]):
        return f"Maravilha! O valor do combo com 2 pijamas curtos é R$ {combo_price:.2f}. A nossa chave Pix é:\n\n{pix_key}\n\nAssim que você fizer, só me mandar o comprovante por aqui pra gente já agendar sua entrega! 🥰 [AGUARDANDO_PAGAMENTO]"

    # 3. Endereço informado
    if any(k in t for k in ["rua", "bairro", "numero", "número", "av", "avenida", "apto", "apartamento", "garanhuns", "bloco", "casa"]):
        return "Endereço anotadinho com sucesso! 🛵✨ Assim que confirmarmos o pagamento já agendamos sua entrega!"

    # 4. Tamanho informado agora
    if detected_size:
        return f"Separamos aqui os modelinhos mais lindos no tamanho {detected_size} que estão disponíveis agora pra você escolher no seu combo! Dá uma olhadinha nessas fotos 👇✨"

    # 5. Já teve conversa anterior
    if len(history) > 1:
        return "Qualquer dúvida estou por aqui! Me conta qual tamanho você costuma vestir (P, M, G ou GG) pra eu te mandar as fotinhas disponíveis agora 💕"

    # 6. Primeiro contato / Saudação
    return "Oie, tudo bem? Aqui é a Cacá da Caça Store 💕 Seja muito bem-vinda!\n\nNossa promoção especial é de 2 pijamas curtos (como o americano ou alcinha) por apenas R$ 200,00! E aqui em Garanhuns a entrega é grátis e super rápida 🛵✨\n\nQual tamanho você veste (P, M, G ou GG) pra eu te mandar agora mesmo as fotos dos modelos disponíveis no seu tamanho? 🥰"

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
        logger.info("[AGENT] Agente desativado globalmente nas configurações (is_active=False).")
        return

    # 2. Modo de Teste / Whitelist
    test_mode = settings.get("test_mode", True)
    whitelist = settings.get("whitelist_phones") or []
    if test_mode and not uazapi.is_phone_in_whitelist(clean_phone, whitelist):
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

    # 9. Chama a inteligência artificial (ou fallback se chave não estiver configurada)
    api_key = settings.get("openrouter_api_key") or OPENROUTER_API_KEY
    model = settings.get("openrouter_model") or OPENROUTER_MODEL
    ai_response = await call_openrouter(llm_messages, api_key=api_key, model=model)

    if not ai_response:
        ai_response = generate_fallback_response(history, text, detected_size, settings)

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

    # 11. Envio de texto (divide em mensagens curtas com espaçamento natural de digitação se tiver quebras de linha duplas)
    text_blocks = [b.strip() for b in cleaned_reply.split("\n\n") if b.strip()]
    if not text_blocks:
        text_blocks = [cleaned_reply]

    for idx, block in enumerate(text_blocks):
        if idx > 0:
            await uazapi.send_presence(clean_phone, "composing", 1500)
            await asyncio.sleep(1.2)
        await uazapi.send_text(clean_phone, block)

    # 12. Se um tamanho foi informado agora, dispara as fotos dos modelos em estoque!
    if detected_size:
        combo_models = inventory.get_combo_models(detected_size)
        logger.info(f"[AGENT] Enviando {len(combo_models)} fotos do tamanho {detected_size} para {clean_phone}")
        await asyncio.sleep(1.0)

        # Envia até 6 fotos com as legendas dos modelos
        for item in combo_models[:6]:
            cap = f"✨ {item['name']} (Tam: {detected_size}) - Participa do Combo 2 por R$ 200"
            await uazapi.send_media(clean_phone, item["image"], cap)
            await asyncio.sleep(1.2)

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
