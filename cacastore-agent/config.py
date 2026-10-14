import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")

UAZAPI_SERVER_URL = os.getenv("UAZAPI_SERVER_URL", "https://timecontroll.uazapi.com").rstrip("/")
UAZAPI_INSTANCE_TOKEN = os.getenv("UAZAPI_INSTANCE_TOKEN", "6c9e3267-343f-4e4d-99fd-cd91a81e236b")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ubnkmtttmvmpminkkasu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibmttdHR0bXZtcG1pbmtrYXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTg3MTIsImV4cCI6MjA4NjE3NDcxMn0.kvsps8nQviGOlQSx2eadeHptpUBNcR2nCizIxX0RIWM")

PORT = int(os.getenv("PORT", "80"))
