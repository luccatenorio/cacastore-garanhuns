import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error('Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const SOURCE_DIR = 'C:/Users/Christian/Desktop/Produtos catalogo 06.10';
const files = fs.readdirSync(SOURCE_DIR);

function titleCase(str) {
  return str.toLowerCase().split(' ').map(word => {
    if (['de', 'da', 'do', 'das', 'dos', 'e', 'c', 'com', 'no', 'na', 'em'].includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log(`🚀 Iniciando importação de ${files.length} produtos para a Cacá Store...`);

  // 1. Atualizar Categorias
  const newCategories = [
    { name: 'Pijamas Americanos', display_order: 1 },
    { name: 'Babydolls', display_order: 2 },
    { name: 'Moda Fitness', display_order: 3 },
    { name: 'Pijamas Longos e Inverno', display_order: 4 },
    { name: 'Masculino', display_order: 5 },
    { name: 'Camisolas', display_order: 6 }
  ];

  for (const cat of newCategories) {
    const { data: existingCat } = await supabase
      .from('caca_categories')
      .select('id')
      .eq('name', cat.name)
      .maybeSingle();

    if (!existingCat) {
      await supabase.from('caca_categories').insert([cat]);
      console.log(`+ Categoria criada: ${cat.name}`);
    }
  }

  // 2. Buscar produtos já existentes no banco para não duplicar
  const { data: existingProducts, error: fetchErr } = await supabase
    .from('caca_products')
    .select('id, name, image');

  if (fetchErr) {
    console.error('Erro ao buscar produtos existentes:', fetchErr);
    process.exit(1);
  }

  console.log(`Produtos já existentes no banco: ${existingProducts.length}`);
  const existingNormMap = new Map();
  existingProducts.forEach(p => {
    existingNormMap.set(normalize(p.name), p);
  });

  // Mapeamentos específicos para evitar duplicar os que já têm fotos melhoradas
  const skipIfMatches = [
    'pijamaamericanocoracao',
    'pijamaalcinhacachorrinhoamarelo',
    'pijamaalcinhagatinhorosa',
    'pijamaalcinhabolinhas',
    'pijamaalcinhacupcake',
    'pijamaamericanorosa',
    'pijamaalcinhalacinho',
    'pijamaamericanoestampamoderna'
  ];

  let uploadedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file);
    const rawName = path.basename(file, ext).trim();

    // Limpeza do nome
    let cleanName = rawName
      .replace(/\s*\(MELHORAR\)\s*/gi, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/P\(MELHORAR\)/gi, '')
      .trim();

    cleanName = titleCase(cleanName);

    // Ajustes finos de nomes
    if (cleanName.toLowerCase().startsWith('pijama amercano')) {
      cleanName = cleanName.replace(/pijama amercano/i, 'Pijama Americano');
    }
    if (cleanName.toLowerCase().startsWith('pijama amercinao')) {
      cleanName = cleanName.replace(/pijama amercinao/i, 'Pijama Americano');
    }
    if (cleanName.toLowerCase().startsWith('pijama cumprido') || cleanName.toLowerCase().startsWith('pijama cumrpido')) {
      cleanName = cleanName.replace(/pijama cum[rp]+ido/i, 'Pijama Comprido');
    }
    if (cleanName.toLowerCase().startsWith('bluza')) {
      cleanName = cleanName.replace(/bluza/i, 'Blusa');
    }
    if (cleanName.toLowerCase().startsWith('pijama f masculino')) {
      cleanName = 'Pijama Masculino Azul Marinho Clássico';
    }
    if (cleanName.toLowerCase().startsWith('whatsapp image')) {
      cleanName = 'Pijama Comprido Estampado Poá';
    }

    const norm = normalize(cleanName);

    // Verificar se já existe
    if (existingNormMap.has(norm) || skipIfMatches.includes(norm)) {
      console.log(`[PULANDO] Já cadastrado com foto melhorada: ${cleanName}`);
      skippedCount++;
      continue;
    }

    // Detecção de Categoria, Preço e Detalhes
    const upper = rawName.toUpperCase();
    let category = 'Pijamas Americanos';
    let price = 109.90;
    let originalPrice = 129.90;
    let costPrice = 65.00;
    let fabric = '100% Algodão Puro';
    let badge = 'Pronta Entrega';
    let isCombo = true;

    if (upper.includes('MASCULINO')) {
      category = 'Masculino';
      price = 119.90;
      originalPrice = 139.90;
      costPrice = 75.00;
      fabric = 'Algodão Premium Confort';
      badge = 'Linha Homem';
      isCombo = false;
    } else if (upper.includes('ACADEMIA') || upper.includes('TOP ') || upper.includes('REGATA') || upper.includes('BLUSA') || upper.includes('BLUSÃO') || upper.includes('BLUZA') || upper.includes('CASACO')) {
      category = 'Moda Fitness';
      price = upper.includes('TOP') ? 69.90 : upper.includes('CASACO') ? 119.90 : 79.90;
      originalPrice = price + 20;
      costPrice = price * 0.55;
      fabric = 'Poliamida com Elastano';
      badge = 'Treino & Conforto';
      isCombo = false;
    } else if (upper.includes('CAMISOLA')) {
      category = 'Camisolas';
      price = 99.90;
      originalPrice = 119.90;
      costPrice = 60.00;
      fabric = 'Suede Soft Touch';
      badge = 'Pronta Entrega';
      isCombo = true;
    } else if (upper.includes('ALCINHA') || upper.includes('SUEDE') || upper.includes('BABYDOLL')) {
      category = 'Babydolls';
      price = 109.90;
      originalPrice = 129.90;
      costPrice = 65.00;
      fabric = upper.includes('SUEDE') ? 'Suede Premium Toque Macio' : '100% Algodão Puro';
      badge = 'Pronta Entrega';
      isCombo = true;
    } else if (upper.includes('COMPRIDO') || upper.includes('CUMPRIDO') || upper.includes('MOLETOM')) {
      category = 'Pijamas Longos e Inverno';
      price = 129.90;
      originalPrice = 149.90;
      costPrice = 75.00;
      fabric = 'Algodão Confort Flanelado';
      badge = 'Inverno Confort';
      isCombo = false;
    } else if (upper.includes('KIT 3 PEÇAS')) {
      category = 'Pijamas Americanos';
      price = 139.90;
      originalPrice = 169.90;
      costPrice = 85.00;
      fabric = '100% Algodão Puro';
      badge = 'Kit Especial 3 Peças';
      isCombo = false;
    }

    if (upper.includes('MELHORAR')) {
      badge = 'Novidade';
    }

    // 3. Upload da Imagem para o Supabase Storage
    const filePath = path.join(SOURCE_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const safeStorageName = `produtos/${Date.now()}_${encodeURIComponent(file.replace(/\s+/g, '_').toLowerCase())}`;

    let imageUrl = `/produtos_catalogo/${encodeURIComponent(file)}`; // Fallback local

    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('caca-store')
        .upload(safeStorageName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!uploadErr && uploadData) {
        const { data: pubData } = supabase.storage
          .from('caca-store')
          .getPublicUrl(uploadData.path);
        if (pubData?.publicUrl) {
          imageUrl = pubData.publicUrl;
          uploadedCount++;
        }
      } else if (uploadErr) {
        console.warn(`Aviso no upload storage (${file}):`, uploadErr.message);
      }
    } catch (err) {
      console.warn(`Erro no upload (${file}), usando fallback local:`, err.message);
    }

    // 4. Inserir produto no Supabase
    const newProduct = {
      name: cleanName,
      category,
      price,
      original_price: originalPrice,
      cost_price: costPrice,
      sizes: ['P', 'M', 'G', 'GG'],
      size_stock: { P: 1, M: 1, G: 1, GG: 1 },
      stock: 4,
      image: imageUrl,
      description: `${cleanName} com acabamento de alta costura, tecido ${fabric.toLowerCase()} e pronta entrega em Garanhuns.`,
      fabric,
      badge,
      is_combo_eligible: isCombo
    };

    const { error: insertErr } = await supabase
      .from('caca_products')
      .insert([newProduct]);

    if (insertErr) {
      console.error(`Erro ao inserir ${cleanName}:`, insertErr.message);
    } else {
      insertedCount++;
      console.log(`[${i + 1}/${files.length}] Cadastrado: ${cleanName} (${category})`);
    }
  }

  console.log(`\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`Total de arquivos: ${files.length}`);
  console.log(`Produtos novos inseridos no banco: ${insertedCount}`);
  console.log(`Imagens hospedadas no Supabase Storage: ${uploadedCount}`);
  console.log(`Produtos pulados (já existentes com foto de alta qualidade): ${skippedCount}`);
}

run().catch(err => {
  console.error('Erro fatal:', err);
});
