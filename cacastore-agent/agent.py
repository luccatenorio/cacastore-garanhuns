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

async def call_vision_ai(
    system_prompt: str,
    history: List[Dict[str, str]],
    current_text: str,
    image_base64: str,
    extra_context: str,
    api_key: str = "",
    model: str = ""
) -> str:
    """Chama IA Multimodal (Google Gemini AIza..., OpenRouter sk-or-... ou OpenAI sk-...)."""
    chosen_key = (api_key or OPENROUTER_API_KEY or "").strip()
    chosen_model = model or OPENROUTER_MODEL or "openai/gpt-4o-mini"

    if not chosen_key:
        return ""

    user_prompt = "\n".join(filter(None, [
        f"[Contexto da Mídia/Anúncio: {extra_context}]" if extra_context else "",
        current_text or ("A cliente enviou esta imagem no WhatsApp. Analise a imagem e responda no estilo da Carmen." if image_base64 else "")
    ]))

    # 1. Suporte nativo para Google Gemini API (AIza...)
    if chosen_key.startswith("AIza"):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={chosen_key}"
            contents = []
            for h in history[-10:]:
                contents.append({
                    "role": "model" if h.get("sender") == "agente_ia" else "user",
                    "parts": [{"text": h.get("content", "")}]
                })
            parts: List[Dict[str, Any]] = [{"text": user_prompt}]
            if image_base64:
                clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_base64)
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": clean_b64
                    }
                })
            contents.append({"role": "user", "parts": parts})

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json={
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": contents,
                    "generationConfig": {"temperature": 0.6, "maxOutputTokens": 450}
                })
                if res.is_success:
                    data = res.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception as e:
            logger.error(f"[GEMINI] Erro: {e}")
        return ""

    # 2. Suporte OpenRouter / OpenAI com Vision
    is_openai = chosen_key.startswith("sk-") and not chosen_key.startswith("sk-or-")
    endpoint = "https://api.openai.com/v1/chat/completions" if is_openai else OPENROUTER_ENDPOINT
    final_model = "gpt-4o-mini" if is_openai else chosen_model

    headers = {
        "Authorization": f"Bearer {chosen_key}",
        "HTTP-Referer": "https://cacastore-garanhuns.vercel.app",
        "X-Title": "CacaStore AI Sales Agent",
        "Content-Type": "application/json"
    }

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for h in history[-12:]:
        role = "assistant" if h.get("sender") == "agente_ia" else "user"
        messages.append({"role": role, "content": h.get("content", "")})

    if image_base64:
        data_uri = image_base64 if image_base64.startswith("data:") else f"data:image/jpeg;base64,{image_base64}"
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": data_uri}}
            ]
        })
    else:
        messages.append({"role": "user", "content": user_prompt})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(endpoint, headers=headers, json={
                "model": final_model,
                "messages": messages,
                "temperature": 0.65,
                "max_tokens": 450
            })
            if res.is_success:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"[OPENROUTER] Erro ({res.status_code}): {res.text}")
    except Exception as e:
        logger.error(f"[OPENROUTER] Exceção: {e}")
    return ""

def generate_fallback_response(
    history: List[Dict[str, str]],
    text: str,
    detected_size: str,
    has_image: bool,
    quoted_caption: str,
    settings: Dict[str, Any]
) -> str:
    """Motor inteligente da Carmen quando não houver chave externa configurada."""
    t = (text or "").lower()
    pix_key = settings.get("pix_key") or "Consulte nossa chave Pix"
    combo_price = int(settings.get("combo_price", 200))

    # 1. Objeção: De onde é a loja / Ponto físico / Prefixo 31
    if any(k in t for k in ["onde fica", "de onde", "ponto fisico", "ponto físico", "ponto fixo", "tempo fixo", "loja fisica", "loja física", "prefixo", "ddd"]):
        return "Sou a Cacá da CacaStore! Nossa loja é virtual aqui em Garanhuns-PE (fazemos entregas *somente em Garanhuns*, e o prefixo 31 é apenas de um número antigo meu). ❤️\n\nNosso estoque fica no centro de Garanhuns, na Dantas Barreto (no prédio da Autoescola Driver)! A gente leva até sua casa com *Entrega Grátis* hoje mesmo, ou atendemos com *horário marcado* se preferir ver pessoalmente.\n\nQual fica mais prático para você: a gente te entregar em casa sem custo ou dar um pulinho aqui? 🥰"

    # 2. Pergunta sobre Camisola / "vestidinho"
    if any(k in t for k in ["vestidinho", "vestido", "camisola", "camisolas"]):
        if detected_size == "P":
            return "Essa que parece um vestidinho é a nossa *Camisola Americana*, toda aberta com botões na frente! 😍\n\nNo momento nossas camisolas esgotaram no tamanho P (temos ela no M e no G por R$ 99 com Entrega Grátis em Garanhuns!). Mas no *tamanho P* tenho modelos lindos de Pijama Curto e Pijama Comprido! Vou te mandar as fotos aqui embaixo 👇❤️"
        if detected_size:
            return f"A nossa *Camisola Americana* é super fresquinha e toda com abertura de botões na frente, saindo por *R$ 99 com Entrega Grátis* aqui em Garanhuns! 😍\n\nVou te mandar aqui embaixo a opção que tenho disponível no tamanho *{detected_size}* e também nossos pijamas da promoção! 👇❤️"
        return "Boa tarde, lindeza! Essa que parece um vestidinho é a nossa *Camisola Americana*, super fresquinha e toda com abertura de botões na frente! 😍\n\nEla está saindo por *R$ 99* com *Entrega Grátis* aqui em Garanhuns! 🛵✨\n\nQual tamanho você veste (*P, M, G ou GG*)? Me fala aqui que já te envio as opções lindas disponíveis no seu tamanho! 🥰👇"

    # 3. Cliente respondeu/marcou uma foto específica
    if quoted_caption:
        clean_name = quoted_caption.replace("✨", "").split("(")[0].strip()
        return f"Amei sua escolha! O modelo *{clean_name}* veste super bem e o tecido é delicioso! 😍\n\nVocê quer levar ele junto com mais 1 modelo para fechar o *Combo de 2 peças por R$ {combo_price}* com *Entrega Grátis* aqui em Garanhuns, ou prefere só ele mesmo? 🛵💕"

    # 4. Cliente enviou uma imagem
    if has_image and not detected_size:
        if any(k in t for k in ["comprovante", "pago", "paguei", "pix feito", "transferi"]):
            return "Comprovante recebido com sucesso, lindeza! Muito obrigada pela confiança! 🥰✨\n\nMe confirma seu endereço certinho com ponto de referência aqui em Garanhuns para a gente já separar e te avisar assim que sair para entrega! 🛵💖 [VENDA_FECHADA]"
        return "Recebi a fotinha que você mandou! 😍 Esse modelo é maravilhoso e super confortável!\n\nMe conta: qual tamanho você veste (*P, M, G ou GG*)? Assim já confiro aqui no estoque e te mando todas as opções disponíveis no seu tamanho com *Entrega Grátis* em Garanhuns! 🥰👇"

    # 5. Cartão de Crédito
    if any(k in t for k in ["cartao", "cartão", "credito", "crédito", "link", "parcelar", "vezes", "parcela", "maquininha"]):
        return "Perfeito, flor! Aceitamos cartão sim! 💳✨\n\nJá acionei nossa equipe aqui para finalizar no cartão ou mandar a maquininha na entrega pra você aqui em Garanhuns. Só um instante que já falamos com você! 💕 [TRANSBORDO_HUMANO]"

    # 6. Pix
    if any(k in t for k in ["pix", "chave", "pagamento", "pagar", "como pago", "qual a chave"]):
        return f"Maravilha, lindeza! Já deixei separado para você! 🥰✨\n\nNossa chave Pix é:\n*{pix_key}*\n\nAssim que fizer, me manda o comprovante e o seu endereço com ponto de referência aqui em Garanhuns que nosso entregador leva hoje mesmo com *Entrega Grátis*! 🛵💕 [AGUARDANDO_PAGAMENTO]"

    # 7. Tamanho informado
    if detected_size:
        return f"Perfeito! Separei aqui as opções mais lindas disponíveis no tamanho *{detected_size}*! 😍\n\nLembrando que *somente hoje* no nosso combo especial você leva *2 pijamas por R$ {combo_price}* (1 sai por *R$ 109*) com *Entrega Grátis* aqui em Garanhuns! Vou te mandar as fotos aqui embaixo 👇\n\nAlém desses modelos do combo, temos também *pijamas compridos (longos)* e *camisolas* lindas! Me diz quais você mais gostou ou se quer ver os compridos e camisolas também! ❤️"

    # 8. Saudação inicial
    if len(history) <= 1:
        return f"Olá! Sou a Cacá da CacaStore, vai ser um prazer te atender!\n\nTemos vários estilos de pijamas, mas *somente hoje* estamos com um combo especial de *2 pijamas por R$ {combo_price}* (1 sai por *R$ 109*) e com *Entrega Grátis* em Garanhuns! Qual tamanho você veste? *P, M, G ou GG*?"

    return "Me conta qual tamanho você veste (*P, M, G ou GG*) ou qual modelinho você mais gostou para eu já separar aqui pra você com *Entrega Grátis* em Garanhuns! 🥰👇"

def extract_size_from_text(text: str) -> str:
    """Detecta tamanho mencionado no texto (GG, P, M, G)."""
    t = (text or "").lower()
    if re.search(r'\b(tamanho\s*gg|visto\s*gg|quero\s*gg|no\s*gg|\bgg\b)\b', t):
        return "GG"
    if re.search(r'\b(tamanho\s*p|visto\s*p|quero\s*p|no\s*p|\bp\b)\b', t):
        return "P"
    if re.search(r'\b(tamanho\s*m|visto\s*m|quero\s*m|no\s*m|\bm\b)\b', t):
        return "M"
    if re.search(r'\b(tamanho\s*g|visto\s*g|quero\s*g|no\s*g|\bg\b)\b', t):
        return "G"
    return ""

async def process_incoming_message(
    phone: str,
    text: str,
    sender_name: str = "",
    message_id: str = "",
    message_type: str = "Conversation",
    image_base64: str = "",
    quoted_caption: str = "",
    is_from_ad: bool = False
):
    """Processa mensagem de texto ou imagem recebida do WhatsApp."""
    clean_phone = uazapi.clean_phone(phone)
    logger.info(f"[PROCESS] Mensagem de {clean_phone} (tipo={message_type}): {text[:50]}")

    settings = inventory.get_settings()
    if not settings.get("is_active", True):
        return

    test_mode = settings.get("test_mode", True)
    whitelist = settings.get("whitelist_phones") or []
    if test_mode and not uazapi.is_phone_in_whitelist(clean_phone, whitelist):
        logger.info(f"[AGENT] Modo Teste ativo: {clean_phone} fora da whitelist.")
        return

    if not image_base64 and "image" in message_type.lower() and message_id:
        image_base64 = await uazapi.download_media_base64(message_id)

    lead_res = supabase.from_("caca_agent_leads").select("*").eq("phone", clean_phone).execute()
    lead = lead_res.data[0] if lead_res.data else None

    msg_display = " ".join(filter(None, [
        "📷 [Imagem enviada]" if image_base64 else "",
        f'💬 [Respondendo à foto: "{quoted_caption}"]' if quoted_caption else "",
        "📢 [Anúncio Instagram]" if is_from_ad else "",
        text
    ])) or "[Mídia]"

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
        supabase.from_("caca_agent_messages").insert({
            "lead_phone": clean_phone,
            "sender": "cliente",
            "content": msg_display
        }).execute()
        return

    supabase.from_("caca_agent_messages").insert({
        "lead_phone": clean_phone,
        "sender": "cliente",
        "content": msg_display
    }).execute()

    await uazapi.mark_read(message_id)
    await uazapi.send_presence(clean_phone, "composing", 1500)

    hist_res = supabase.from_("caca_agent_messages").select("sender, content").eq("lead_phone", clean_phone).order("created_at", desc=False).limit(16).execute()
    history = hist_res.data or []

    pix_key = settings.get("pix_key") or "Consulte no chat"
    custom_system_prompt = SYSTEM_PROMPT.replace("{PIX_KEY}", pix_key)

    detected_size = extract_size_from_text(text)
    if detected_size:
        supabase.from_("caca_agent_leads").update({"size": detected_size, "updated_at": "now()"}).eq("phone", clean_phone).execute()

    extra_parts = []
    if is_from_ad:
        extra_parts.append("Cliente veio de um anúncio do Instagram da CaçaStore.")
    if quoted_caption:
        extra_parts.append(f'Cliente respondeu à foto com legenda: "{quoted_caption}".')
    if detected_size:
        extra_parts.append(f"Cliente informou o tamanho {detected_size}. As fotos reais do tamanho {detected_size} serão enviadas automaticamente.")

    api_key = settings.get("openrouter_api_key") or OPENROUTER_API_KEY
    model = settings.get("openrouter_model") or OPENROUTER_MODEL
    ai_response = await call_vision_ai(
        custom_system_prompt,
        history[:-1],
        text,
        image_base64,
        " ".join(extra_parts),
        api_key=api_key,
        model=model
    )

    if not ai_response:
        ai_response = generate_fallback_response(history, text, detected_size, bool(image_base64), quoted_caption, settings)

    new_status = lead.get("status", "em_atendimento")
    pause_ai = False

    if "[TRANSBORDO_HUMANO]" in ai_response:
        new_status = "aguardando_humano"
        pause_ai = True
    elif "[PAGAMENTO_CONFIRMADO]" in ai_response:
        new_status = "pago"
    elif "[AGUARDANDO_PAGAMENTO]" in ai_response:
        new_status = "aguardando_pagamento"
    else:
        new_status = "em_atendimento"

    cleaned_reply = ai_response.replace("[TRANSBORDO_HUMANO]", "")\
                               .replace("[PAGAMENTO_CONFIRMADO]", "")\
                               .replace("[AGUARDANDO_PAGAMENTO]", "").strip()

    text_blocks = [b.strip() for b in cleaned_reply.split("\n\n") if b.strip()] or [cleaned_reply]

    for idx, block in enumerate(text_blocks):
        if idx > 0:
            await uazapi.send_presence(clean_phone, "composing", 1000)
            await asyncio.sleep(0.9)
        await uazapi.send_text(clean_phone, block)

    if detected_size:
        combo_models = inventory.get_combo_models(detected_size)
        await asyncio.sleep(0.8)
        for item in combo_models[:6]:
            cap = f"✨ {item['name']} (Tam: {detected_size})"
            await uazapi.send_media(clean_phone, item["image"], cap)
            await asyncio.sleep(0.9)

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
