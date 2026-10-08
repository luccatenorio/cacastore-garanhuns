-- ========================================================
-- TABELA DE PRODUTOS - CACASTORE GARANHUNS (SUPABASE SQL)
-- ========================================================

-- 1. Criação da tabela de produtos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    cost_price NUMERIC(10,2),
    sizes TEXT[] NOT NULL DEFAULT ARRAY['M'],
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    fabric TEXT,
    badge TEXT,
    is_combo_eligible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso:
-- Qualquer visitante pode ler produtos do catálogo
CREATE POLICY "Public Read Access" 
ON public.products 
FOR SELECT 
USING (true);

-- Usuários autenticados podem inserir, editar e deletar
CREATE POLICY "Admin Full Access" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Permissão anônima para escrita (se você não quiser tela de login complexa no início)
CREATE POLICY "Anon Full Access Dev" 
ON public.products 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- ========================================================
-- BUCKET DE IMAGENS (STORAGE)
-- ========================================================
-- Crie um bucket público no painel do Supabase com o nome:
-- 'product-images' com acesso público de leitura.
