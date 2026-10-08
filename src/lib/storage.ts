import { Product, Combo, SaleRecord } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'cacastore_products_v1';
const LOCAL_CATEGORIES_KEY = 'cacastore_categories_v1';

const DEFAULT_CATEGORIES = [
  'Pijamas Americanos',
  'Bermudolls',
  'Babydolls',
  'Moda Fitness',
  'Pijamas Longos e Inverno',
  'Masculino',
  'Camisolas',
];

// --- 1. Upload de Imagens no Bucket caca-store (Supabase Storage) ---

export async function uploadProductImage(file: File): Promise<{ url: string | null; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      const fileName = `produtos/${Date.now()}_${cleanName}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('caca-store')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        console.error('Erro ao enviar imagem ao bucket caca-store:', uploadError);
        return { url: null, error: uploadError.message };
      }

      const { data: publicData } = supabase.storage
        .from('caca-store')
        .getPublicUrl(uploadData.path);

      if (publicData?.publicUrl) {
        return { url: publicData.publicUrl };
      }
    } catch (err: any) {
      console.error('Falha no upload do Supabase Storage:', err);
      return { url: null, error: err.message || 'Erro inesperado no upload' };
    }
  }

  // Fallback: Converter para Base64 local se Supabase não responder
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string });
    };
    reader.onerror = () => {
      resolve({ url: null, error: 'Erro ao processar imagem localmente.' });
    };
    reader.readAsDataURL(file);
  });
}

// --- 2. Categorias & Coleções (Tabela caca_categories) ---

export async function getCategoriesAsync(): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('caca_categories')
        .select('name')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        const catNames = data.map((c: any) => c.name);
        localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(catNames));
        return catNames;
      }
    } catch (e) {
      console.warn('Erro ao buscar caca_categories no Supabase, usando local', e);
    }
  }

  return getCategories();
}

export function getCategories(): string[] {
  const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler categorias', e);
    }
  }
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export async function saveCategory(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) return getCategories();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('caca_categories')
        .insert([{ name: trimmed }])
        .select();
    } catch (e) {
      console.error('Erro ao salvar categoria no Supabase', e);
    }
  }

  const current = getCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));
    return updated;
  }
  return current;
}

export async function deleteCategory(name: string): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('caca_categories')
        .delete()
        .eq('name', name);
    } catch (e) {
      console.error('Erro ao excluir categoria no Supabase', e);
    }
  }

  const current = getCategories();
  const updated = current.filter(c => c !== name);
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));
  return updated;
}

// --- 3. Produtos & Estoque (Tabela caca_products) ---

export async function getProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('caca_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedProducts: Product[] = data.map((row: any) => {
          const rawSizes = row.sizes || ['P', 'M', 'G', 'GG'];
          let parsedSizeStock: Record<string, number> = {};

          if (row.size_stock && typeof row.size_stock === 'object' && Object.keys(row.size_stock).length > 0) {
            parsedSizeStock = row.size_stock;
          } else {
            // Se ainda não tinha size_stock, gera distribuição proporcional padrão
            const total = Number(row.stock || 4);
            const perSize = Math.max(1, Math.floor(total / rawSizes.length));
            rawSizes.forEach((s: string, idx: number) => {
              parsedSizeStock[s] = idx === rawSizes.length - 1
                ? Math.max(0, total - (perSize * (rawSizes.length - 1)))
                : perSize;
            });
          }

          const calculatedStock = Object.values(parsedSizeStock).reduce((a, b) => a + Number(b || 0), 0);

          return {
            id: row.id,
            name: row.name,
            category: row.category,
            price: Number(row.price),
            originalPrice: row.original_price ? Number(row.original_price) : undefined,
            costPrice: row.cost_price ? Number(row.cost_price) : undefined,
            sizes: rawSizes,
            sizeStock: parsedSizeStock,
            stock: calculatedStock > 0 ? calculatedStock : Number(row.stock || 0),
            image: row.image,
            images: [row.image],
            description: row.description || '',
            fabric: row.fabric || '100% Algodão Puro',
            badge: row.badge,
            isComboEligible: row.is_combo_eligible ?? true,
          };
        });

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mappedProducts));
        return mappedProducts;
      }
    } catch (e) {
      console.warn('Falha ao conectar no Supabase caca_products, usando armazenamento local.', e);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler do localStorage', e);
    }
  }

  // Seed with initial products
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

export async function saveProduct(product: Product): Promise<Product> {
  const totalStock = product.sizeStock
    ? Object.values(product.sizeStock).reduce((a, b) => a + Number(b || 0), 0)
    : Number(product.stock || 0);

  const normalizedSizes = product.sizeStock
    ? Object.keys(product.sizeStock)
    : (product.sizes || ['P', 'M', 'G', 'GG']);

  const dbPayload = {
    name: product.name,
    category: product.category,
    price: product.price,
    original_price: product.originalPrice,
    cost_price: product.costPrice || 0,
    sizes: normalizedSizes,
    size_stock: product.sizeStock || {},
    stock: totalStock,
    image: product.image,
    description: product.description,
    fabric: product.fabric,
    badge: product.badge,
    is_combo_eligible: product.isComboEligible ?? true,
    updated_at: new Date().toISOString(),
  };

  const productToReturn = {
    ...product,
    sizes: normalizedSizes,
    stock: totalStock,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // Se possui id no formato UUID (gerado pelo Supabase)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

      if (product.id && isUUID) {
        const { data, error } = await supabase
          .from('caca_products')
          .update(dbPayload)
          .eq('id', product.id)
          .select()
          .single();

        if (!error && data) return { ...product, id: data.id };
      } else {
        const { data, error } = await supabase
          .from('caca_products')
          .insert([dbPayload])
          .select()
          .single();

        if (!error && data) return { ...product, id: data.id };
      }
    } catch (e) {
      console.error('Erro ao salvar no Supabase caca_products, salvando localmente', e);
    }
  }

  // Local storage save
  const current = await getProducts();
  const existingIndex = current.findIndex(p => p.id === product.id);
  let updatedList: Product[];

  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = product;
  } else {
    const newProduct = {
      ...product,
      id: product.id || `local-${Date.now()}`
    };
    updatedList = [newProduct, ...current];
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('caca_products').delete().eq('id', id);
    } catch (e) {
      console.error('Erro ao deletar no Supabase caca_products', e);
    }
  }

  const current = await getProducts();
  const filtered = current.filter(p => p.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export async function resetToDefaultProducts(): Promise<Product[]> {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return INITIAL_PRODUCTS;
}

// --- 4. Combos Promocionais (Tabela caca_combos) ---

const LOCAL_COMBOS_KEY = 'cacastore_combos_v1';

export async function getCombos(): Promise<Combo[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('caca_combos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: Combo[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description || '',
          product1Id: row.product1_id,
          product1Name: row.product1_name,
          product1Image: row.product1_image,
          product2Id: row.product2_id,
          product2Name: row.product2_name,
          product2Image: row.product2_image,
          originalPrice: Number(row.original_price),
          comboPrice: Number(row.combo_price),
          badge: row.badge || 'Frete Grátis',
          isActive: row.is_active ?? true,
        }));
        localStorage.setItem(LOCAL_COMBOS_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Erro ao carregar caca_combos do Supabase', e);
    }
  }

  const saved = localStorage.getItem(LOCAL_COMBOS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler combos locais', e);
    }
  }

  return [];
}

export async function saveCombo(combo: Combo): Promise<Combo> {
  const dbPayload = {
    name: combo.name,
    description: combo.description || '',
    product1_id: combo.product1Id,
    product1_name: combo.product1Name,
    product1_image: combo.product1Image,
    product2_id: combo.product2Id,
    product2_name: combo.product2Name,
    product2_image: combo.product2Image,
    original_price: combo.originalPrice,
    combo_price: combo.comboPrice,
    badge: combo.badge || 'Frete Grátis',
    is_active: combo.isActive ?? true,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(combo.id);
      if (combo.id && isUUID) {
        const { data, error } = await supabase
          .from('caca_combos')
          .update(dbPayload)
          .eq('id', combo.id)
          .select()
          .single();
        if (!error && data) return { ...combo, id: data.id };
      } else {
        const { data, error } = await supabase
          .from('caca_combos')
          .insert([dbPayload])
          .select()
          .single();
        if (!error && data) return { ...combo, id: data.id };
      }
    } catch (e) {
      console.error('Erro ao salvar caca_combos no Supabase', e);
    }
  }

  const current = await getCombos();
  const existingIdx = current.findIndex(c => c.id === combo.id);
  let updatedList: Combo[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = combo;
  } else {
    const newCombo = { ...combo, id: combo.id || `combo-${Date.now()}` };
    updatedList = [newCombo, ...current];
  }
  localStorage.setItem(LOCAL_COMBOS_KEY, JSON.stringify(updatedList));
  return combo;
}

export async function deleteCombo(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('caca_combos').delete().eq('id', id);
    } catch (e) {
      console.error('Erro ao deletar caca_combos no Supabase', e);
    }
  }

  const current = await getCombos();
  const filtered = current.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_COMBOS_KEY, JSON.stringify(filtered));
  return true;
}

// --- 5. Vendas & Histórico (Tabela caca_sales) ---

const LOCAL_SALES_KEY = 'cacastore_sales_v1';

export async function getSales(): Promise<SaleRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('caca_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: SaleRecord[] = data.map((row: any) => ({
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          productImage: row.product_image,
          category: row.category,
          size: row.size,
          quantity: Number(row.quantity || 1),
          price: Number(row.price || 0),
          costPrice: Number(row.cost_price || 0),
          profit: Number(row.profit || 0),
          paymentMethod: row.payment_method || 'pix',
          notes: row.notes,
          saleDate: row.sale_date || new Date(row.created_at).toISOString().split('T')[0],
          createdAt: row.created_at || new Date().toISOString(),
        }));
        localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Erro ao carregar vendas do Supabase caca_sales', e);
    }
  }

  const saved = localStorage.getItem(LOCAL_SALES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler vendas locais', e);
    }
  }

  return [];
}

export async function recordSale(sale: {
  productId?: string;
  productName: string;
  productImage?: string;
  category?: string;
  size: string;
  quantity?: number;
  price: number;
  costPrice?: number;
  paymentMethod?: string;
  notes?: string;
  saleDate?: string;
}): Promise<SaleRecord | null> {
  const qty = sale.quantity || 1;
  const cost = sale.costPrice || 0;
  const profit = (sale.price - cost) * qty;
  const now = new Date();
  const saleDate = sale.saleDate || now.toISOString().split('T')[0];

  const dbPayload = {
    product_id: sale.productId,
    product_name: sale.productName,
    product_image: sale.productImage,
    category: sale.category,
    size: sale.size,
    quantity: qty,
    price: sale.price,
    cost_price: cost,
    profit: profit,
    payment_method: sale.paymentMethod || 'pix',
    notes: sale.notes || '',
    sale_date: saleDate,
    created_at: now.toISOString(),
  };

  let createdRecord: SaleRecord | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('caca_sales')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        createdRecord = {
          id: data.id,
          productId: data.product_id,
          productName: data.product_name,
          productImage: data.product_image,
          category: data.category,
          size: data.size,
          quantity: Number(data.quantity || 1),
          price: Number(data.price),
          costPrice: Number(data.cost_price),
          profit: Number(data.profit),
          paymentMethod: data.payment_method,
          notes: data.notes,
          saleDate: data.sale_date,
          createdAt: data.created_at,
        };
      }
    } catch (e) {
      console.error('Erro ao gravar venda no Supabase caca_sales', e);
    }
  }

  if (!createdRecord) {
    createdRecord = {
      id: `sale-${Date.now()}`,
      productId: sale.productId,
      productName: sale.productName,
      productImage: sale.productImage,
      category: sale.category,
      size: sale.size,
      quantity: qty,
      price: sale.price,
      costPrice: cost,
      profit: profit,
      paymentMethod: sale.paymentMethod || 'pix',
      notes: sale.notes,
      saleDate: saleDate,
      createdAt: now.toISOString(),
    };
  }

  // Atualizar lista local de vendas
  const currentSales = await getSales();
  localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify([createdRecord, ...currentSales]));

  // Se houver productId, decrementar o estoque daquele tamanho específico e o total!
  if (sale.productId) {
    const products = await getProducts();
    const prod = products.find(p => p.id === sale.productId);
    if (prod) {
      const currentSizeStock = { ...(prod.sizeStock || {}) };
      const currentForSize = Number(currentSizeStock[sale.size] || 0);
      const newForSize = Math.max(0, currentForSize - qty);
      currentSizeStock[sale.size] = newForSize;

      const newTotalStock = Object.values(currentSizeStock).reduce((a, b) => a + Number(b || 0), 0);

      const updatedProd: Product = {
        ...prod,
        sizeStock: currentSizeStock,
        stock: newTotalStock,
      };

      await saveProduct(updatedProd);
    }
  }

  return createdRecord;
}

export async function deleteSale(saleId: string, restoreStock: boolean = true): Promise<boolean> {
  const sales = await getSales();
  const saleToDelete = sales.find(s => s.id === saleId);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('caca_sales').delete().eq('id', saleId);
    } catch (e) {
      console.error('Erro ao excluir venda no Supabase caca_sales', e);
    }
  }

  const filtered = sales.filter(s => s.id !== saleId);
  localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify(filtered));

  if (restoreStock && saleToDelete && saleToDelete.productId) {
    const products = await getProducts();
    const prod = products.find(p => p.id === saleToDelete.productId);
    if (prod) {
      const currentSizeStock = { ...(prod.sizeStock || {}) };
      const currentForSize = Number(currentSizeStock[saleToDelete.size] || 0);
      currentSizeStock[saleToDelete.size] = currentForSize + (saleToDelete.quantity || 1);
      const newTotalStock = Object.values(currentSizeStock).reduce((a, b) => a + Number(b || 0), 0);

      await saveProduct({
        ...prod,
        sizeStock: currentSizeStock,
        stock: newTotalStock,
      });
    }
  }

  return true;
}

export async function clearAllSales(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('caca_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.error('Erro ao limpar vendas no Supabase caca_sales', e);
    }
  }

  localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify([]));
  return true;
}



