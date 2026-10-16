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
async def handle_uazapi_webhook(request: Request):
    """Encaminha eventos para o motor unificado v4 (Supabase Edge Function + n8n Vision Bridge)."""
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"[WEBHOOK] Erro ao ler JSON do webhook: {e}")
        return {"status": "error", "message": "Invalid JSON"}

    import httpx
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                "https://ubnkmtttmvmpminkkasu.supabase.co/functions/v1/caca-agent-webhook",
                json=payload
            )
            return res.json()
    except Exception as e:
        logger.error(f"[WEBHOOK PROXY] Erro: {e}")
        return {"status": "error", "message": str(e)}

