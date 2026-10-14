import logging
from typing import List, Dict, Any
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_size(text: str) -> str:
    """Normaliza o tamanho informado para P, M, G, GG ou Plus Size."""
    t = text.strip().upper()
    if t in ["P", "PEQUENO"]:
        return "P"
    if t in ["M", "MEDIO", "MÉDIO"]:
        return "M"
    if t in ["G", "GRANDE"]:
        return "G"
    if t in ["GG", "EXTRA GRANDE", "XG"]:
        return "GG"
    if "PLUS" in t or "G1" in t or "G2" in t:
        return "PLUS"
    return ""

def get_products_by_size(size: str) -> List[Dict[str, Any]]:
    """Consulta produtos no Supabase que tenham estoque no tamanho especificado."""
    sz = normalize_size(size)
    if not sz or sz == "PLUS":
        return []

    try:
        res = supabase.from_("caca_products").select("id, name, category, price, original_price, image, size_stock, stock").execute()
        all_products = res.data or []
        
        # Filtra apenas quem tem estoque > 0 no tamanho
        available = []
        for p in all_products:
            size_stock = p.get("size_stock") or {}
            qty = size_stock.get(sz, 0)
            if qty > 0 and p.get("image"):
                available.append({
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "category": p.get("category"),
                    "price": p.get("price"),
                    "original_price": p.get("original_price"),
                    "image": p.get("image"),
                    "stock_in_size": qty
                })
        return available
    except Exception as e:
        logger.error(f"[INVENTORY] Erro ao consultar estoque para tamanho {size}: {e}")
        return []

def get_combo_models(size: str) -> List[Dict[str, Any]]:
    """Retorna os modelos participantes do combo (Americanos e Babydolls/Alcinhas)."""
    items = get_products_by_size(size)
    combo_items = []
    for item in items:
        cat = (item.get("category") or "").upper()
        name = (item.get("name") or "").upper()
        # Não incluir moda masculina no combo padrão feminino a não ser que peça
        if "MASCULINO" in cat or "MASCULINO" in name:
            continue
        # Priorizar Americanos e Babydolls/Alcinhas
        if "AMERICANO" in cat or "BABYDOLL" in cat or "BERMUDOLL" in cat or "AMERICANO" in name or "ALCINHA" in name:
            combo_items.append(item)
    return combo_items

def get_settings() -> Dict[str, Any]:
    """Recupera as configurações do agente do banco de dados."""
    try:
        res = supabase.from_("caca_agent_settings").select("*").eq("id", "default").execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"[SETTINGS] Erro ao buscar configurações: {e}")
    return {
        "is_active": True,
        "test_mode": True,
        "whitelist_phones": ["553197584189", "558781563664"],
        "pix_key": "",
        "combo_price": 200.00
    }
