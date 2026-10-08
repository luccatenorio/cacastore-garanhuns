import os
import mimetypes
import requests

SUPABASE_URL = "https://ubnkmtttmvmpminkkasu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibmttdHR0bXZtcG1pbmtrYXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTg3MTIsImV4cCI6MjA4NjE3NDcxMn0.kvsps8nQviGOlQSx2eadeHptpUBNcR2nCizIxX0RIWM"
BUCKET_NAME = "caca-store"

PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fotos_produtos")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

def upload_file(local_path):
    filename = os.path.basename(local_path)
    mime_type, _ = mimetypes.guess_type(local_path)
    mime_type = mime_type or "image/jpeg"

    # Destination path in storage
    dest_path = f"produtos/{filename}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{dest_path}"

    with open(local_path, "rb") as f:
        file_bytes = f.read()

    upload_headers = {
        **HEADERS,
        "Content-Type": mime_type,
        "x-upsert": "true",
    }

    resp = requests.post(upload_url, headers=upload_headers, data=file_bytes)
    if resp.status_code in [200, 201]:
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{dest_path}"
        print(f"✅ Enviado com sucesso: {filename} -> {public_url}")
        return public_url
    else:
        print(f"❌ Erro ao enviar {filename} ({resp.status_code}): {resp.text}")
        return None

def main():
    if not os.path.exists(PHOTOS_DIR):
        print(f"Pasta {PHOTOS_DIR} não encontrada.")
        return

    files = [f for f in os.listdir(PHOTOS_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    if not files:
        print(f"Nenhuma foto encontrada na pasta: {PHOTOS_DIR}")
        print("Coloque suas fotos nessa pasta e rode o script novamente!")
        return

    print(f"Encontradas {len(files)} fotos para envio...")
    uploaded = {}
    for f in files:
        local_path = os.path.join(PHOTOS_DIR, f)
        url = upload_file(local_path)
        if url:
            uploaded[f] = url

    print("\n--- RESUMO DE FOTOS NA NUVEM SUPABASE ---")
    for fname, url in uploaded.items():
        print(f"{fname}: {url}")

if __name__ == "__main__":
    main()
