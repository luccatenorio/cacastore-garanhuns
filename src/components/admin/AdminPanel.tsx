import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, ArrowLeft, Package, DollarSign, Sparkles, RefreshCw, Check, X, ShieldCheck, FolderPlus, Image as ImageIcon, Upload, Lock, LogOut, Loader2, CloudUpload, ShoppingCart, AlertCircle, PlusCircle, MinusCircle, Gift, Percent, Tag, Eye, TrendingUp, Calendar, CheckCircle2, ZoomIn, Search } from 'lucide-react';
import { Product, Combo, SaleRecord } from '../../types';
import { getProducts, saveProduct, deleteProduct, resetToDefaultProducts, getCategories, getCategoriesAsync, saveCategory, deleteCategory, uploadProductImage, getCombos, saveCombo, deleteCombo, getSales, recordSale, deleteSale, clearAllSales } from '../../lib/storage';
import { getAdminSession, loginAdmin, logoutAdmin, AdminUser } from '../../lib/auth';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SalesDashboard } from './SalesDashboard';

interface ImageHoverPreview {
  url: string;
  name: string;
  subtext?: string;
  price?: number;
  x: number;
  y: number;
}

interface AdminPanelProps {
  onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => getAdminSession());
  const [loginEmail, setLoginEmail] = useState('admin@cacastore.com.br');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Panel State
  const [activeTab, setActiveTab] = useState<'estoque' | 'vendas' | 'combos' | 'vendidos' | 'colecoes'>('estoque');
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Preview de foto ampliada no hover
  const [hoveredImage, setHoveredImage] = useState<ImageHoverPreview | null>(null);

  const handleImageHover = (
    e: React.MouseEvent<HTMLElement>,
    data: { url: string; name: string; subtext?: string; price?: number }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 260;
    const popupHeight = 350;

    // Posicionamento horizontal inteligente
    let x = rect.right + 14;
    if (x + popupWidth > window.innerWidth - 12) {
      x = Math.max(12, rect.left - popupWidth - 14);
    }

    // Posicionamento vertical centralizado e limitado à tela
    let y = rect.top + rect.height / 2 - popupHeight / 2;
    if (y + popupHeight > window.innerHeight - 12) {
      y = window.innerHeight - popupHeight - 12;
    }
    if (y < 12) {
      y = 12;
    }

    setHoveredImage({
      ...data,
      x,
      y,
    });
  };

  const handleImageLeave = () => {
    setHoveredImage(null);
  };

  // Modal de Venda Rápida (Ao clicar em "Vendi")
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [saleSize, setSaleSize] = useState<string>('');
  const [salePayment, setSalePayment] = useState<string>('pix');
  const [saleDate, setSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modal Rápido de Ajuste de Estoque por Tamanho (Grade)
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [tempSizeStock, setTempSizeStock] = useState<Record<string, number>>({});

  // Filtros rápidos na aba de Estoque
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('Todas');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');

  // New Category state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form states for Product
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(100);
  const [originalPrice, setOriginalPrice] = useState(129.9);
  const [costPrice, setCostPrice] = useState(70);
  const [sizes, setSizes] = useState<string[]>(['P', 'M', 'G', 'GG']);
  const [sizeStock, setSizeStock] = useState<Record<string, number>>({ P: 3, M: 4, G: 2, GG: 1 });
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [stock, setStock] = useState(10);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [fabric, setFabric] = useState('100% Algodão Puro');
  const [badge, setBadge] = useState('Pronta Entrega');
  const [isComboEligible, setIsComboEligible] = useState(true);

  // Form states for Combo
  const [isCreatingCombo, setIsCreatingCombo] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboBadge, setComboBadge] = useState('Frete Grátis Garanhuns');
  const [comboProduct1Id, setComboProduct1Id] = useState('');
  const [comboProduct2Id, setComboProduct2Id] = useState('');
  const [comboOriginalPrice, setComboOriginalPrice] = useState(200);
  const [comboPrice, setComboPrice] = useState(190);
  const [comboIsActive, setComboIsActive] = useState(true);

  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restaura a posição de scroll ou rola suavemente até o produto alterado
  const restoreScrollPosition = (productId?: string, fallbackScrollY?: number) => {
    requestAnimationFrame(() => {
      if (productId) {
        const el = document.getElementById(`product-row-${productId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }
      }
      if (fallbackScrollY !== undefined) {
        window.scrollTo({ top: fallbackScrollY, behavior: 'instant' });
      }
    });
  };

  const loadData = async (silent = false) => {
    // Só exibe tela de carregamento completa se não for silencioso e não houver produtos
    if (!silent && products.length === 0) {
      setLoading(true);
    }
    try {
      const prodList = await getProducts();
      const catList = await getCategoriesAsync();
      const comboList = await getCombos();
      const salesList = await getSales();
      setProducts(prodList);
      setCategories(catList);
      setCombos(comboList);
      setSales(salesList);
      if (!category && catList.length > 0) {
        setCategory(catList[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData(false);
    }
  }, [currentUser]);

  const showFeedbackMessage = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3800);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const result = await loginAdmin(loginEmail, loginPassword);
    setLoginLoading(false);

    if (result.success && result.user) {
      setCurrentUser(result.user);
      showFeedbackMessage('Login efetuado com sucesso!');
    } else {
      setLoginError(result.error || 'Credenciais inválidas.');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setCurrentUser(null);
    showFeedbackMessage('Sessão encerrada com segurança.');
  };

  // Image Upload handler (Uploads to Supabase Storage Bucket caca-store)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      showFeedbackMessage('Enviando foto para a nuvem Supabase...');
      const { url, error } = await uploadProductImage(file);
      setUploadingImage(false);

      if (url) {
        setImage(url);
        showFeedbackMessage('Foto salva na nuvem Supabase com sucesso!');
      } else {
        showFeedbackMessage(`Erro ao subir foto: ${error || 'Tente novamente'}`);
      }
    }
  };

  // --- Ações de "Vendi" com Seleção de Tamanho e Registro Diário ---

  const handleOpenQuickSale = (product: Product) => {
    setSellingProduct(product);
    // Selecionar o primeiro tamanho que tenha estoque positivo
    const sizeList = product.sizes || ['P', 'M', 'G', 'GG'];
    const availableSize = sizeList.find(s => (product.sizeStock ? (product.sizeStock[s] || 0) > 0 : true)) || sizeList[0] || 'M';
    setSaleSize(availableSize);
    setSalePayment('pix');
    setSaleDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmQuickSale = async () => {
    if (!sellingProduct || !saleSize) return;
    const targetId = sellingProduct.id;
    const currentScrollY = window.scrollY;

    await recordSale({
      productId: sellingProduct.id,
      productName: sellingProduct.name,
      productImage: sellingProduct.image,
      category: sellingProduct.category,
      size: saleSize,
      quantity: 1,
      price: sellingProduct.price,
      costPrice: sellingProduct.costPrice || 70,
      paymentMethod: salePayment,
      saleDate: saleDate,
    });

    const profit = sellingProduct.price - (sellingProduct.costPrice || 70);
    showFeedbackMessage(`🎉 Venda de "${sellingProduct.name}" (Tam ${saleSize}) registrada! Lucro: ${formatPrice(profit)}`);
    setSellingProduct(null);
    setHighlightedProductId(targetId);
    setTimeout(() => setHighlightedProductId(null), 3000);
    restoreScrollPosition(targetId, currentScrollY);

    await loadData(true);
    restoreScrollPosition(targetId, currentScrollY);
  };

  const handleAdjustStock = async (product: Product, delta: number) => {
    const targetId = product.id;
    const currentScrollY = window.scrollY;
    const currentStock = product.stock || 0;
    const newStock = Math.max(0, currentStock + delta);
    const updatedProduct = { ...product, stock: newStock };
    
    // Atualização otimista imediata
    setProducts(prev => prev.map(p => p.id === targetId ? updatedProduct : p));
    setHighlightedProductId(targetId);
    setTimeout(() => setHighlightedProductId(null), 3000);
    restoreScrollPosition(targetId, currentScrollY);

    if (newStock === 0) {
      showFeedbackMessage(`Estoque zerado! "${product.name}" foi movido para Vendidos/Esgotados.`);
    } else {
      showFeedbackMessage(`Estoque de "${product.name}" atualizado para ${newStock} peça(s).`);
    }

    await saveProduct(updatedProduct);
    await loadData(true);
    restoreScrollPosition(targetId, currentScrollY);
  };

  const handleReplenishStock = async (product: Product, amount: number) => {
    const targetId = product.id;
    const currentScrollY = window.scrollY;
    const currentStock = product.stock || 0;
    const newStock = currentStock + amount;
    // Se possui sizeStock, adiciona aos tamanhos existentes
    let updatedSizeStock = { ...(product.sizeStock || {}) };
    if (Object.keys(updatedSizeStock).length > 0) {
      const firstSize = Object.keys(updatedSizeStock)[0];
      updatedSizeStock[firstSize] = (updatedSizeStock[firstSize] || 0) + amount;
    } else {
      updatedSizeStock = { M: amount };
    }

    const updatedProduct = { ...product, stock: newStock, sizeStock: updatedSizeStock };
    setProducts(prev => prev.map(p => p.id === targetId ? updatedProduct : p));
    setHighlightedProductId(targetId);
    setTimeout(() => setHighlightedProductId(null), 3000);
    restoreScrollPosition(targetId, currentScrollY);

    showFeedbackMessage(`📦 +${amount} peça(s) adicionadas a "${product.name}"! A peça voltou automaticamente à vitrine.`);
    await saveProduct(updatedProduct);
    await loadData(true);
    restoreScrollPosition(targetId, currentScrollY);
  };

  // --- Handlers de Cadastro & Edição com Quantidade por Tamanho ---

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setOriginalPrice(p.originalPrice || p.price * 1.25);
    setCostPrice(p.costPrice || 70);
    
    // Obter ou inicializar sizeStock
    let initialSizeStock: Record<string, number> = {};
    if (p.sizeStock && Object.keys(p.sizeStock).length > 0) {
      initialSizeStock = { ...p.sizeStock };
    } else {
      const szList = p.sizes && p.sizes.length > 0 ? p.sizes : ['P', 'M', 'G', 'GG'];
      const perSize = Math.max(1, Math.floor((p.stock || 4) / szList.length));
      szList.forEach((s, idx) => {
        initialSizeStock[s] = idx === szList.length - 1 ? Math.max(0, (p.stock || 4) - perSize * (szList.length - 1)) : perSize;
      });
    }

    setSizeStock(initialSizeStock);
    setSizes(Object.keys(initialSizeStock));
    const totalSum = Object.values(initialSizeStock).reduce((a, b) => a + Number(b || 0), 0);
    setStock(totalSum > 0 ? totalSum : p.stock);
    setImage(p.image);
    setDescription(p.description);
    setFabric(p.fabric);
    setBadge(p.badge || '');
    setIsComboEligible(p.isComboEligible ?? true);
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setCategory(categories[0] || 'Pijamas Americanos');
    setPrice(100);
    setOriginalPrice(129.9);
    setCostPrice(70);
    const defaultSizeStock: Record<string, number> = { P: 3, M: 4, G: 2, GG: 1 };
    setSizeStock(defaultSizeStock);
    setSizes(Object.keys(defaultSizeStock));
    setStock(10);
    setImage('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80');
    setDescription('Pijama confortável para pronta entrega em Garanhuns.');
    setFabric('100% Algodão Puro');
    setBadge('Pronta Entrega');
    setIsComboEligible(true);
    setIsCreating(true);
  };

  const handleSizeQtyChange = (size: string, qty: number) => {
    const updated = { ...sizeStock, [size]: Math.max(0, qty) };
    setSizeStock(updated);
    const sum = Object.values(updated).reduce((a, b) => a + Number(b || 0), 0);
    setStock(sum);
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (sizeStock[trimmed] === undefined) {
      const updated = { ...sizeStock, [trimmed]: 2 };
      setSizeStock(updated);
      setSizes(Object.keys(updated));
      const sum = Object.values(updated).reduce((a, b) => a + Number(b || 0), 0);
      setStock(sum);
    }
    setCustomSizeInput('');
  };

  const handleRemoveSize = (size: string) => {
    const updated = { ...sizeStock };
    delete updated[size];
    // Se ficou vazio, mantém pelo menos M
    if (Object.keys(updated).length === 0) {
      updated['M'] = 1;
    }
    setSizeStock(updated);
    setSizes(Object.keys(updated));
    const sum = Object.values(updated).reduce((a, b) => a + Number(b || 0), 0);
    setStock(sum);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image) {
      alert('Preencha o nome e selecione uma foto!');
      return;
    }

    const calculatedStock = Object.values(sizeStock).reduce((a, b) => a + Number(b || 0), 0);
    const targetId = editingProduct ? editingProduct.id : `local-${Date.now()}`;
    const currentScrollY = window.scrollY;

    const productPayload: Product = {
      id: targetId,
      name,
      category: category || categories[0] || 'Pijamas Americanos',
      price: Number(price),
      originalPrice: Number(originalPrice),
      costPrice: Number(costPrice),
      sizes: Object.keys(sizeStock),
      sizeStock: sizeStock,
      stock: calculatedStock,
      image,
      images: [image],
      description,
      fabric,
      badge,
      isComboEligible,
    };

    // 1. Atualização otimista imediata para não ter delay na UI
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === targetId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = productPayload;
        return copy;
      }
      return [productPayload, ...prev];
    });

    // 2. Fecha o modal
    setEditingProduct(null);
    setIsCreating(false);

    // 3. Marca e rola suavemente para o mesmo canto onde o usuário estava
    setHighlightedProductId(targetId);
    setTimeout(() => setHighlightedProductId(null), 3500);
    restoreScrollPosition(targetId, currentScrollY);

    showFeedbackMessage(editingProduct ? 'Peça atualizada no Supabase com sucesso!' : 'Nova peça salva no Supabase com sucesso!');

    try {
      await saveProduct(productPayload);
      // 4. Sincroniza em background sem desmontar o DOM
      await loadData(true);
      restoreScrollPosition(targetId, currentScrollY);
    } catch (err) {
      console.error('Erro ao salvar peça:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
      await deleteProduct(id);
      showFeedbackMessage('Peça removida.');
      loadData();
    }
  };

  // Category handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const updated = await saveCategory(newCategoryName);
    setCategories(updated);
    setNewCategoryName('');
    showFeedbackMessage(`Coleção "${newCategoryName}" salva no Supabase!`);
  };

  const handleDeleteCategory = async (catName: string) => {
    if (confirm(`Deseja remover a coleção "${catName}"?`)) {
      const updated = await deleteCategory(catName);
      setCategories(updated);
      showFeedbackMessage(`Coleção removida.`);
    }
  };

  // --- Combo Handlers ---
  const handleOpenCreateCombo = () => {
    setEditingCombo(null);
    setIsCreatingCombo(true);

    const prod1 = products[0];
    const prod2 = products[1] || products[0];

    const p1Id = prod1 ? prod1.id : '';
    const p2Id = prod2 ? prod2.id : '';
    const p1Price = prod1 ? prod1.price : 100;
    const p2Price = prod2 ? prod2.price : 100;
    const origSum = p1Price + p2Price;

    setComboProduct1Id(p1Id);
    setComboProduct2Id(p2Id);
    setComboOriginalPrice(origSum);
    setComboPrice(Math.round(origSum * 0.88));
    setComboName(prod1 && prod2 ? `Combo ${prod1.name} + ${prod2.name}` : 'Combo Especial 2 Peças');
    setComboDescription('Leve 2 peças exclusivas com desconto especial e entrega rápida em Garanhuns.');
    setComboBadge('Frete Grátis Garanhuns');
    setComboIsActive(true);
  };

  const handleOpenEditCombo = (c: Combo) => {
    setEditingCombo(c);
    setIsCreatingCombo(true);
    setComboName(c.name);
    setComboDescription(c.description || '');
    setComboBadge(c.badge || 'Frete Grátis');
    setComboProduct1Id(c.product1Id || '');
    setComboProduct2Id(c.product2Id || '');
    setComboOriginalPrice(c.originalPrice);
    setComboPrice(c.comboPrice);
    setComboIsActive(c.isActive ?? true);
  };

  const handleProduct1Select = (pId: string) => {
    setComboProduct1Id(pId);
    const p1 = products.find(p => p.id === pId);
    const p2 = products.find(p => p.id === comboProduct2Id);
    if (p1 && p2) {
      const sum = p1.price + p2.price;
      setComboOriginalPrice(sum);
      setComboPrice(Math.round(sum * 0.88));
      if (!editingCombo) {
        setComboName(`Combo ${p1.name} + ${p2.name}`);
      }
    }
  };

  const handleProduct2Select = (pId: string) => {
    setComboProduct2Id(pId);
    const p1 = products.find(p => p.id === comboProduct1Id);
    const p2 = products.find(p => p.id === pId);
    if (p1 && p2) {
      const sum = p1.price + p2.price;
      setComboOriginalPrice(sum);
      setComboPrice(Math.round(sum * 0.88));
      if (!editingCombo) {
        setComboName(`Combo ${p1.name} + ${p2.name}`);
      }
    }
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = products.find(p => p.id === comboProduct1Id);
    const p2 = products.find(p => p.id === comboProduct2Id);

    if (!p1 || !p2) {
      alert('Selecione os 2 produtos que farão parte do combo!');
      return;
    }

    const comboPayload: Combo = {
      id: editingCombo ? editingCombo.id : `combo-${Date.now()}`,
      name: comboName.trim() || `Combo ${p1.name} + ${p2.name}`,
      description: comboDescription.trim(),
      product1Id: p1.id,
      product1Name: p1.name,
      product1Image: p1.image,
      product2Id: p2.id,
      product2Name: p2.name,
      product2Image: p2.image,
      originalPrice: Number(comboOriginalPrice),
      comboPrice: Number(comboPrice),
      badge: comboBadge.trim() || 'Frete Grátis Garanhuns',
      isActive: comboIsActive,
    };

    await saveCombo(comboPayload);
    showFeedbackMessage(editingCombo ? 'Combo atualizado no Supabase!' : 'Novo combo criado no Supabase com sucesso!');
    setIsCreatingCombo(false);
    setEditingCombo(null);
    loadData();
  };

  const handleDeleteCombo = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este combo promocional?')) {
      await deleteCombo(id);
      showFeedbackMessage('Combo removido do Supabase!');
      loadData();
    }
  };

  const handleToggleComboActive = async (c: Combo) => {
    const updated = { ...c, isActive: !c.isActive };
    await saveCombo(updated);
    showFeedbackMessage(`Combo "${c.name}" ${updated.isActive ? 'ativado no catálogo' : 'pausado'}.`);
    loadData();
  };

  const handleReset = async () => {
    if (confirm('Deseja restaurar as peças e coleções padrão?')) {
      await resetToDefaultProducts();
      showFeedbackMessage('Estoque e coleções restauradas!');
      loadData();
    }
  };

  const toggleSize = (s: string) => {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Segregar produtos em Estoque Ativo vs Vendidos/Esgotados
  const inStockProducts = products.filter(p => (p.stock || 0) > 0);
  const soldOutProducts = products.filter(p => (p.stock || 0) <= 0);

  // Lista de produtos filtrada para a aba principal de Estoque (com todos os modelos cadastrados)
  const filteredStockProducts = useMemo(() => {
    return products.filter(p => {
      if (stockCategoryFilter !== 'Todas' && p.category !== stockCategoryFilter) {
        return false;
      }
      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.fabric && p.fabric.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [products, stockCategoryFilter, stockSearchQuery]);

  const handleOpenQuickStock = (p: Product) => {
    setQuickStockProduct(p);
    const szMap: Record<string, number> = { P: 0, M: 0, G: 0, GG: 0 };
    if (p.sizeStock) {
      Object.keys(p.sizeStock).forEach(k => {
        szMap[k] = p.sizeStock![k] || 0;
      });
    }
    setTempSizeStock(szMap);
  };

  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    const targetId = quickStockProduct.id;
    const currentScrollY = window.scrollY;
    const total = Object.values(tempSizeStock).reduce((a, b) => a + Number(b || 0), 0);
    const updated: Product = {
      ...quickStockProduct,
      sizeStock: tempSizeStock,
      sizes: Object.keys(tempSizeStock),
      stock: total,
    };

    // 1. Atualização otimista imediata
    setProducts(prev => prev.map(p => p.id === targetId ? updated : p));
    setQuickStockProduct(null);

    // 2. Destaca e restaura posição da tela
    setHighlightedProductId(targetId);
    setTimeout(() => setHighlightedProductId(null), 3500);
    restoreScrollPosition(targetId, currentScrollY);

    showFeedbackMessage(`✅ Estoque de "${quickStockProduct.name}" atualizado para ${total} peças!`);

    try {
      await saveProduct(updated);
      await loadData(true);
      restoreScrollPosition(targetId, currentScrollY);
    } catch (err) {
      console.error('Erro ao salvar grade:', err);
    }
  };

  // Ajuste rápido de estoque direto na linha (+ e - por tamanho sem abrir modal)
  const handleQuickChangeSizeStock = async (product: Product, size: string, delta: number) => {
    const baseSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['P', 'M', 'G', 'GG'];
    const currentSizeStock: Record<string, number> = {
      P: 0, M: 0, G: 0, GG: 0,
      ...(product.sizeStock || {})
    };

    const currentQty = currentSizeStock[size] !== undefined ? currentSizeStock[size] : 0;
    const newQty = Math.max(0, currentQty + delta);
    currentSizeStock[size] = newQty;

    const newTotalStock = Object.values(currentSizeStock).reduce((a, b) => a + Number(b || 0), 0);

    const updatedProduct: Product = {
      ...product,
      sizeStock: currentSizeStock,
      sizes: Array.from(new Set([...baseSizes, ...Object.keys(currentSizeStock)])),
      stock: newTotalStock,
    };

    // Atualização otimista imediata para resposta instantânea ao clique
    setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));

    try {
      await saveProduct(updatedProduct);
      if (delta > 0) {
        showFeedbackMessage(`+1 ${size} em "${product.name}" (${newTotalStock} peças no total)`);
      } else {
        showFeedbackMessage(`-1 ${size} de "${product.name}" (${newTotalStock} peças no total)`);
      }
    } catch (err) {
      console.error('Erro ao salvar ajuste rápido:', err);
    }
  };

  // Metrics de Estoque
  const totalStockPieces = inStockProducts.reduce((acc, p) => acc + p.stock, 0);
  const totalRetailValue = inStockProducts.reduce((acc, p) => acc + p.price * p.stock, 0);
  const totalEstimatedProfit = inStockProducts.reduce((acc, p) => acc + (p.price - (p.costPrice || 70)) * p.stock, 0);

  // Metrics de Vendas Realizadas (GMV e Lucro Feito)
  const totalGMV = sales.reduce((acc, s) => acc + s.price, 0);
  const totalRealizedProfit = sales.reduce((acc, s) => acc + s.profit, 0);
  const totalPiecesSold = sales.reduce((acc, s) => acc + (s.quantity || 1), 0);

  // --- 1. Tela de Login se não autenticado ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A1329] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex justify-center">
            <img
              src="/logo-header.png"
              alt="Caca Store"
              className="h-16 w-auto object-contain drop-shadow"
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900">Acesso Restrito ao Painel</h2>
            <p className="text-xs text-gray-500">
              Faça login seguro para cadastrar peças, coleções e gerenciar o estoque no Supabase.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                E-mail de Acesso
              </label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@cacastore.com.br"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0A1329] focus:ring-1 focus:ring-[#0A1329] bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0A1329] focus:ring-1 focus:ring-[#0A1329] bg-gray-50"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-[#0A1329] hover:bg-[#16264C] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#D4AF37]" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 text-[11px]">
              Credencial: <strong className="text-gray-600">admin@cacastore.com.br</strong> / <strong className="text-gray-600">1010caca</strong>
            </span>
            <button
              onClick={onExit}
              className="text-[#0A1329] font-bold hover:underline cursor-pointer"
            >
              Voltar à Loja
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- 2. Painel Administrativo Completo Autenticado ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#0A1329] transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ver Loja</span>
          </button>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-[#0A1329] leading-tight flex items-center gap-2">
              <span>Painel de Gestão & Estoque • Caca Store</span>
            </h1>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00B048]" />
              {isSupabaseConfigured ? 'Conectado com Segurança ao Supabase Pro (ELOS TESTE)' : 'Armazenamento Local Ativo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-gray-800">{currentUser.email}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sessão Ativa
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Sair do painel"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>

          <button
            onClick={handleReset}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
            title="Restaurar dados padrão"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={handleOpenCreateCombo}
            className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0A1329] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>Criar Combo</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-[#0A1329] hover:bg-[#16264C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Peça</span>
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-20 right-4 z-50 bg-[#00B048] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-4">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{feedback}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Navigation Tabs com Contadores */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab('estoque')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'estoque'
                ? 'bg-[#0A1329] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>🛍️ Peças em Estoque</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'estoque' ? 'bg-[#D4AF37] text-[#0A1329]' : 'bg-gray-200 text-gray-800'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vendas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vendas'
                ? 'bg-[#00B048] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>📊 Vendas & Métricas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'vendas' ? 'bg-white text-[#00B048]' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {sales.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('combos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'combos'
                ? 'bg-[#0A1329] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>🎁 Combos Promocionais</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'combos' ? 'bg-[#D4AF37] text-[#0A1329]' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {combos.length}
            </span>
          </button>

          {/* Aba Vendidos/Esgotados pausada temporariamente a pedido do usuário */}

          <button
            onClick={() => setActiveTab('colecoes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'colecoes'
                ? 'bg-[#0A1329] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>📁 Coleções & Categorias</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'colecoes' ? 'bg-white text-[#0A1329]' : 'bg-gray-200 text-gray-800'
            }`}>
              {categories.length}
            </span>
          </button>
        </div>

        {/* Financial Dashboard Cards - GMV, Lucro Feito & Estoque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* 1. GMV Geral de Vendas Realizadas */}
          <div
            onClick={() => setActiveTab('vendas')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all cursor-pointer hover:border-[#0A1329]"
            title="Clique para ver o relatório completo de vendas"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0A1329] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-[#0A1329]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">GMV Geral (Vendas)</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{formatPrice(totalGMV)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{totalPiecesSold} peças vendidas</p>
            </div>
          </div>

          {/* 2. Lucro Feito (Realizado / Bolso) */}
          <div
            onClick={() => setActiveTab('vendas')}
            className="bg-emerald-50/80 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all cursor-pointer hover:border-[#00B048]"
            title="Clique para ver o lucro detalhado por venda"
          >
            <div className="w-12 h-12 rounded-xl bg-[#00B048] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider truncate">Lucro Feito (Bolso)</p>
              <p className="text-xl sm:text-2xl font-black text-[#00B048] leading-tight">+{formatPrice(totalRealizedProfit)}</p>
              <p className="text-[10px] text-emerald-700/80 mt-0.5">Líquido já realizado</p>
            </div>
          </div>

          {/* 3. Peças na Vitrine (Estoque Ativo) */}
          <div
            onClick={() => setActiveTab('estoque')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all cursor-pointer hover:border-gray-400"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 text-[#0A1329] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Peças na Vitrine</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {totalStockPieces} <span className="text-xs font-normal text-gray-400">unid.</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{inStockProducts.length} modelos ativos</p>
            </div>
          </div>

          {/* 4. Valor do Estoque Ativo */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#997316] flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Faturamento Ativo</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 leading-tight">{formatPrice(totalRetailValue)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Potencial do estoque</p>
            </div>
          </div>

          {/* 5. Lucro Estimado do Estoque */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Lucro Estimado</p>
              <p className="text-lg sm:text-xl font-black text-purple-700 leading-tight">{formatPrice(totalEstimatedProfit)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">A faturar no estoque</p>
            </div>
          </div>

        </div>

        {/* Tab 1: Peças em Estoque (Todos os Modelos Cadastrados) */}
        {activeTab === 'estoque' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              
              {/* Barra Superior com Contadores, Busca e Filtro de Coleção */}
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 text-sm">
                      Modelos Cadastrados no Estoque
                    </h3>
                    <span className="bg-[#0A1329] text-[#D4AF37] text-xs font-black px-2.5 py-0.5 rounded-full">
                      {products.length} modelos
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Clique direto no botão <strong>"+"</strong> ao lado de cada tamanho (P, M, G, GG) para somar as peças na hora sem precisar abrir janela!
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Busca Rápida */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar modelo ou estampa..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A1329] w-48 sm:w-56"
                    />
                  </div>

                  {/* Filtro de Categoria */}
                  <select
                    value={stockCategoryFilter}
                    onChange={(e) => setStockCategoryFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-gray-300 text-xs bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A1329]"
                  >
                    <option value="Todas">Todas as Coleções ({products.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c} ({products.filter(p => p.category === c).length})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleOpenCreate}
                    className="bg-[#0A1329] hover:bg-[#16264C] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Nova Peça</span>
                  </button>
                </div>
              </div>

              {loading && products.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-xs">Carregando catálogo do Supabase...</div>
              ) : filteredStockProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-xs space-y-2">
                  <p className="font-bold text-sm text-gray-800">Nenhum produto encontrado para este filtro.</p>
                  <p>Tente limpar o campo de busca ou selecionar outra coleção.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-4">Peça</th>
                        <th className="py-3 px-4">Coleção</th>
                        <th className="py-3 px-4">Preço Venda</th>
                        <th className="py-3 px-4">Custo</th>
                        <th className="py-3 px-4 min-w-[270px]">Contar Grade (+ / -)</th>
                        <th className="py-3 px-4 text-center">Estoque Atual</th>
                        <th className="py-3 px-4 text-center">Ajuste Rápido</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredStockProducts.map((p) => {
                        const hasStock = (p.stock || 0) > 0;
                        const isHighlighted = highlightedProductId === p.id;
                        return (
                          <tr
                            key={p.id}
                            id={`product-row-${p.id}`}
                            className={`transition-all duration-300 ${
                              isHighlighted
                                ? 'bg-amber-100/80 ring-2 ring-[#D4AF37] shadow-inner'
                                : 'hover:bg-gray-50/80'
                            }`}
                          >
                            <td className="py-3 px-4 flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                onMouseEnter={(e) =>
                                  handleImageHover(e, {
                                    url: p.image,
                                    name: p.name,
                                    subtext: p.fabric || p.category,
                                    price: p.price,
                                  })
                                }
                                onMouseLeave={handleImageLeave}
                                className="w-10 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0 cursor-zoom-in hover:ring-2 hover:ring-[#00B048] hover:scale-105 transition-all shadow-xs"
                              />
                              <div>
                                <p className="font-bold text-gray-900">{p.name}</p>
                                <p className="text-[11px] text-gray-500">{p.fabric}</p>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-gray-600 font-medium">
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px]">
                                {p.category}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-bold text-gray-900">
                              {formatPrice(p.price)}
                            </td>

                            <td className="py-3 px-4 text-gray-500">
                              {p.costPrice ? formatPrice(p.costPrice) : 'R$ 65,00'}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex gap-1.5 flex-wrap min-w-[250px] max-w-[340px]">
                                {(p.sizes && p.sizes.length > 0 ? p.sizes : ['P', 'M', 'G', 'GG']).map((s) => {
                                  const qty = p.sizeStock ? (p.sizeStock[s] || 0) : 0;
                                  return (
                                    <div
                                      key={s}
                                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs font-bold transition-all shadow-2xs select-none ${
                                        qty > 0
                                          ? 'bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/40'
                                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <span className="font-extrabold text-[11px] text-gray-600 uppercase">{s}:</span>
                                      <strong className={`font-black text-xs ${qty > 0 ? 'text-[#00B048]' : 'text-gray-400'}`}>
                                        {qty}
                                      </strong>

                                      <div className="inline-flex items-center gap-0.5 ml-0.5">
                                        {qty > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleQuickChangeSizeStock(p, s, -1);
                                            }}
                                            className="w-4 h-4 rounded bg-gray-100 hover:bg-red-500 hover:text-white text-gray-700 flex items-center justify-center text-[10px] font-black cursor-pointer transition-colors shadow-2xs active:scale-90"
                                            title={`Diminuir 1 ${s}`}
                                          >
                                            -
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickChangeSizeStock(p, s, 1);
                                          }}
                                          className="w-5 h-5 rounded-md bg-[#0A1329] hover:bg-[#00B048] text-white flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-xs hover:scale-110 active:scale-95"
                                          title={`Adicionar +1 unidade no tamanho ${s}`}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Estoque Atual */}
                            <td className="py-3 px-4 text-center">
                              {hasStock ? (
                                <span className="inline-flex items-center justify-center font-black text-[#00B048] text-xs bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                                  {p.stock} un
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center font-bold text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                  0 un (Zerado)
                                </span>
                              )}
                            </td>

                            {/* Botão de Ajuste Rápido de Grade */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleOpenQuickStock(p)}
                                className="px-3 py-1.5 rounded-xl bg-[#0A1329] hover:bg-[#16264C] text-[#F6E6B4] hover:text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 mx-auto shadow-xs active:scale-95 transition-all cursor-pointer border border-[#D4AF37]/40"
                                title="Ajustar quantidades de P, M, G, GG desta peça"
                              >
                                <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Ajustar Grade</span>
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {hasStock && (
                                  <button
                                    onClick={() => handleOpenQuickSale(p)}
                                    className="px-2.5 py-1 rounded-lg bg-[#00B048] hover:bg-[#00963d] text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                                    title="Registrar venda"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Vendi</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                                  title="Editar detalhes completos"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Excluir produto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dashboard de Vendas & Relatório Diário */}
        {activeTab === 'vendas' && (
          <SalesDashboard
            sales={sales}
            products={products}
            onRecordSale={async (saleData) => {
              await recordSale(saleData);
              showFeedbackMessage(`🎉 Venda de "${saleData.productName}" (Tam ${saleData.size}) registrada com sucesso!`);
              loadData();
            }}
            onDeleteSale={async (saleId, restoreStock) => {
              await deleteSale(saleId, restoreStock);
              showFeedbackMessage(restoreStock ? 'Venda estornada e peça devolvida ao estoque!' : 'Venda excluída do histórico!');
              loadData();
            }}
            onClearAllSales={async () => {
              await clearAllSales();
              showFeedbackMessage('Histórico de vendas zerado com sucesso!');
              loadData();
            }}
          />
        )}

        {/* Tab 3: Vendidos / Esgotados */}
        {activeTab === 'vendidos' && (
          <div className="space-y-6">
            {/* Explanatory Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold text-sm">
                  Peças Esgotadas ficam Ocultas da Loja Automaticamente!
                </p>
                <p>
                  Quando o estoque de um pijama chega a <strong>0</strong>, ele some imediatamente da vitrine pública do catálogo para evitar pedidos de itens indisponíveis.
                </p>
                <p>
                  Assim que chegarem novas unidades da confecção, basta clicar nos botões <strong>"+1"</strong>, <strong>"+5"</strong> ou <strong>"+10"</strong> abaixo para repor e a peça volta instantaneamente à loja!
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 text-sm">Peças Vendidas / Esgotadas ({soldOutProducts.length})</h3>
                <p className="text-xs text-gray-500">Histórico de produtos sem estoque ativo no momento</p>
              </div>

              {soldOutProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  Nenhuma peça esgotada no momento. Todas as peças cadastradas estão disponíveis na vitrine!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-4">Peça</th>
                        <th className="py-3 px-4">Coleção</th>
                        <th className="py-3 px-4">Preço Venda</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Repor Estoque Rápido</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {soldOutProducts.map((p) => {
                        const isHighlighted = highlightedProductId === p.id;
                        return (
                          <tr
                            key={p.id}
                            id={`product-row-${p.id}`}
                            className={`transition-all duration-300 ${
                              isHighlighted
                                ? 'bg-amber-100/80 ring-2 ring-[#D4AF37] shadow-inner'
                                : 'hover:bg-gray-50/80'
                            }`}
                          >
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img
                              src={p.image}
                              alt={p.name}
                              onMouseEnter={(e) =>
                                handleImageHover(e, {
                                  url: p.image,
                                  name: p.name,
                                  subtext: p.fabric || p.category,
                                  price: p.price,
                                })
                              }
                              onMouseLeave={handleImageLeave}
                              className="w-10 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0 opacity-70 grayscale-30 cursor-zoom-in hover:ring-2 hover:ring-[#00B048] hover:scale-105 hover:opacity-100 hover:grayscale-0 transition-all shadow-xs"
                            />
                            <div>
                              <p className="font-bold text-gray-900">{p.name}</p>
                              <p className="text-[11px] text-gray-500">{p.fabric}</p>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-gray-600 font-medium">
                            {p.category}
                          </td>

                          <td className="py-3 px-4 font-bold text-gray-900">
                            {formatPrice(p.price)}
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Esgotado (Fora da Vitrine)
                            </span>
                          </td>

                          {/* Quick Replenish Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleReplenishStock(p, 1)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
                                title="Adicionar 1 peça e voltar à loja"
                              >
                                +1 Peça
                              </button>
                              <button
                                onClick={() => handleReplenishStock(p, 5)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
                                title="Adicionar 5 peças e voltar à loja"
                              >
                                +5 Peças
                              </button>
                              <button
                                onClick={() => handleReplenishStock(p, 10)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                                title="Adicionar 10 peças e voltar à loja"
                              >
                                +10 Peças
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Coleções & Categorias */}
        {activeTab === 'colecoes' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Cadastrar Nova Coleção / Categoria</h3>
              <p className="text-xs text-gray-500 mb-4">
                As coleções cadastradas aqui aparecem automaticamente nos filtros do catálogo da Caca Store.
              </p>

              <form onSubmit={handleAddCategory} className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Ex: Pijamas de Seda, Infantil, Verão..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                />
                <button
                  type="submit"
                  className="bg-[#0A1329] hover:bg-[#16264C] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Adicionar Coleção</span>
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden max-w-2xl">
              <div className="p-4 border-b border-gray-200 font-bold text-gray-900 text-sm">
                Coleções Ativas ({categories.length})
              </div>

              <ul className="divide-y divide-gray-100 text-xs">
                {categories.map((cat) => (
                  <li key={cat} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-gray-800">{cat}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Excluir Coleção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 4: Gestão de Combos Promocionais */}
        {activeTab === 'combos' && (
          <div className="space-y-6">
            {/* Header com botão de criar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#D4AF37]" />
                  <span>Combos & Ofertas Exclusivas ({combos.length})</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Monte kits especiais de 2 peças com valor promocional. Os combos aparecem em destaque na vitrine para aumentar o ticket médio.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateCombo}
                className="bg-[#0A1329] hover:bg-[#16264C] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Criar Novo Combo</span>
              </button>
            </div>

            {/* Lista de Combos */}
            {combos.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300 space-y-3">
                <Gift className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-bold text-gray-700 text-sm">Nenhum combo cadastrado ainda</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Crie seu primeiro combo selecionando 2 peças para oferecer desconto e frete grátis aos clientes de Garanhuns.
                </p>
                <button
                  onClick={handleOpenCreateCombo}
                  className="mt-2 bg-[#0A1329] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Criar Primeiro Combo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map((combo) => {
                  const original = combo.originalPrice || combo.comboPrice;
                  const discount = Math.max(0, original - combo.comboPrice);
                  const discountPercent = original > 0 ? Math.round((discount / original) * 100) : 0;

                  return (
                    <div
                      key={combo.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                    >
                      {/* Top: Status & Badges */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md flex items-center gap-1 ${
                          combo.isActive !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${combo.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          {combo.isActive !== false ? 'Ativo no Catálogo' : 'Pausado'}
                        </span>

                        <div className="flex items-center gap-2">
                          {discountPercent > 0 && (
                            <span className="bg-[#00B048] text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 fill-current" />
                              {discountPercent}% OFF
                            </span>
                          )}
                          <span className="bg-[#0A1329] text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded">
                            {combo.badge || 'Frete Grátis'}
                          </span>
                        </div>
                      </div>

                      {/* Double Product Visual */}
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {/* Img 1 */}
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                          <img
                            src={combo.product1Image}
                            alt={combo.product1Name}
                            onMouseEnter={(e) =>
                              handleImageHover(e, {
                                url: combo.product1Image,
                                name: combo.product1Name,
                                subtext: 'Peça 1 do Combo',
                              })
                            }
                            onMouseLeave={handleImageLeave}
                            className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Plus connector */}
                        <div className="w-6 h-6 rounded-full bg-[#0A1329] text-[#D4AF37] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          +
                        </div>

                        {/* Img 2 */}
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                          <img
                            src={combo.product2Image}
                            alt={combo.product2Name}
                            onMouseEnter={(e) =>
                              handleImageHover(e, {
                                url: combo.product2Image,
                                name: combo.product2Name,
                                subtext: 'Peça 2 do Combo',
                              })
                            }
                            onMouseLeave={handleImageLeave}
                            className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Names */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-bold text-gray-900 truncate">1. {combo.product1Name}</p>
                          <p className="text-xs font-bold text-gray-900 truncate">2. {combo.product2Name}</p>
                          {combo.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{combo.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Title & Values */}
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                          {combo.name}
                        </h3>

                        <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-gray-950">
                              {formatPrice(combo.comboPrice)}
                            </span>
                            {original > combo.comboPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(original)}
                              </span>
                            )}
                          </div>

                          {discount > 0 && (
                            <span className="text-[11px] text-[#00B048] font-bold">
                              Economia de {formatPrice(discount)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleComboActive(combo)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                            combo.isActive !== false
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {combo.isActive !== false ? 'Pausar Combo' : 'Ativar no Catálogo'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCombo(combo)}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Editar Combo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCombo(combo.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                            title="Excluir Combo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal: Cadastro & Edição de Combo */}
      {isCreatingCombo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#D4AF37]" />
                  <span>{editingCombo ? 'Editar Combo Promocional' : 'Criar Novo Combo Promocional'}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Selecione as 2 peças que formarão o kit com desconto no Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCombo(false);
                  setEditingCombo(null);
                }}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCombo} className="space-y-5 text-xs">
              
              {/* Product 1 Selector */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  1. Selecione a Primeira Peça do Combo
                </label>
                <select
                  value={comboProduct1Id}
                  onChange={(e) => handleProduct1Select(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#0A1329]"
                >
                  <option value="">Selecione a Peça 1...</option>
                  {products.map((p) => (
                    <option key={`p1-sel-${p.id}`} value={p.id}>
                      {p.name} — {formatPrice(p.price)} (Estoque: {p.stock})
                    </option>
                  ))}
                </select>

                {/* Preview Prod 1 */}
                {comboProduct1Id && (() => {
                  const p1 = products.find(p => p.id === comboProduct1Id);
                  if (!p1) return null;
                  return (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={p1.image} alt={p1.name} className="w-12 h-14 rounded-lg object-cover border border-gray-300" />
                      <div>
                        <p className="font-bold text-gray-900">{p1.name}</p>
                        <p className="text-gray-500 text-[11px]">{formatPrice(p1.price)} • {p1.category}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Product 2 Selector */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  2. Selecione a Segunda Peça do Combo
                </label>
                <select
                  value={comboProduct2Id}
                  onChange={(e) => handleProduct2Select(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#0A1329]"
                >
                  <option value="">Selecione a Peça 2...</option>
                  {products.map((p) => (
                    <option key={`p2-sel-${p.id}`} value={p.id}>
                      {p.name} — {formatPrice(p.price)} (Estoque: {p.stock})
                    </option>
                  ))}
                </select>

                {/* Preview Prod 2 */}
                {comboProduct2Id && (() => {
                  const p2 = products.find(p => p.id === comboProduct2Id);
                  if (!p2) return null;
                  return (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={p2.image} alt={p2.name} className="w-12 h-14 rounded-lg object-cover border border-gray-300" />
                      <div>
                        <p className="font-bold text-gray-900">{p2.name}</p>
                        <p className="text-gray-500 text-[11px]">{formatPrice(p2.price)} • {p2.category}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Price Calculation Card */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Soma dos Preços Normais (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={comboOriginalPrice}
                      onChange={(e) => setComboOriginalPrice(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">
                      Preço do Combo Promocional (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={comboPrice}
                      onChange={(e) => setComboPrice(Number(e.target.value))}
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-black text-gray-900"
                    />
                  </div>
                </div>

                {/* Live Savings Alert */}
                {(() => {
                  const savings = Math.max(0, comboOriginalPrice - comboPrice);
                  const pct = comboOriginalPrice > 0 ? Math.round((savings / comboOriginalPrice) * 100) : 0;
                  return (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
                      <span className="font-bold text-emerald-800">
                        Economia para a cliente:
                      </span>
                      <span className="font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                        Economiza {formatPrice(savings)} ({pct}% OFF)
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Combo Name */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Nome do Combo
                </label>
                <input
                  type="text"
                  required
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Ex: Combo Look Virgínia + Babydoll Algodão"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#0A1329]"
                />
              </div>

              {/* Description & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Selo / Badge Destaque
                  </label>
                  <input
                    type="text"
                    value={comboBadge}
                    onChange={(e) => setComboBadge(e.target.value)}
                    placeholder="Ex: Frete Grátis Garanhuns"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Status na Loja
                  </label>
                  <select
                    value={comboIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setComboIsActive(e.target.value === 'active')}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#0A1329]"
                  >
                    <option value="active">Visível no Catálogo (Ativo)</option>
                    <option value="inactive">Pausado (Oculto na Loja)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Descrição do Combo
                </label>
                <textarea
                  rows={2}
                  value={comboDescription}
                  onChange={(e) => setComboDescription(e.target.value)}
                  placeholder="Ex: Escolha qualquer modelo americano ou babydoll. Desconto aplicado e frete grátis..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCombo(false);
                    setEditingCombo(null);
                  }}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0A1329] hover:bg-[#16264C] text-white font-bold uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-2"
                >
                  <Gift className="w-4 h-4 text-[#D4AF37]" />
                  <span>Salvar Combo no Supabase</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro & Edição de Produto */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                {editingProduct ? 'Editar Peça' : 'Cadastrar Nova Peça no Estoque'}
              </h2>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsCreating(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-800 mb-1">Nome da Peça</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pijama Americano Clássico Navy"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Coleção / Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Selo / Badge</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Ex: Mais Vendido, Algodão Puro"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Preço Original (De)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                  />
                </div>
              </div>

              {/* Estoque e Quantidade por Tamanho (ex: 3P, 4M, 2G, 1GG) */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-gray-900 text-xs">
                      Estoque por Tamanho (ex: 3P, 4M, 2G...)
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Defina a quantidade de cada tamanho. O estoque total é a soma automática.
                    </p>
                  </div>
                  <div className="bg-[#0A1329] text-white px-3 py-1 rounded-xl text-xs font-black shadow-xs">
                    Total: {Object.values(sizeStock).reduce((a, b) => a + Number(b || 0), 0)} peças
                  </div>
                </div>

                {/* Grade de Tamanhos e Quantidades */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(sizeStock).map(([s, qty]) => (
                    <div key={`sz-input-${s}`} className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs space-y-1 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-[#0A1329] bg-gray-100 px-2 py-0.5 rounded">
                          Tam: {s}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(s)}
                          className="text-gray-300 hover:text-red-500 text-xs font-bold px-1 cursor-pointer"
                          title="Remover tamanho"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSizeQtyChange(s, qty - 1)}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => handleSizeQtyChange(s, Number(e.target.value))}
                          className="w-full text-center font-black text-xs bg-gray-50 rounded border border-gray-200 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSizeQtyChange(s, qty + 1)}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adicionar Tamanho Rápido ou Personalizado */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {['P', 'M', 'G', 'GG', 'XG', 'Único'].filter(s => sizeStock[s] === undefined).map(quickSize => (
                      <button
                        key={`quick-add-${quickSize}`}
                        type="button"
                        onClick={() => {
                          const updated = { ...sizeStock, [quickSize]: 2 };
                          setSizeStock(updated);
                          setSizes(Object.keys(updated));
                          setStock(Object.values(updated).reduce((a, b) => a + Number(b || 0), 0));
                        }}
                        className="text-[10px] font-bold bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-2 py-1 rounded-lg cursor-pointer"
                      >
                        + {quickSize}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Outro tam..."
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs w-24"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSize}
                      className="bg-gray-800 hover:bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer uppercase"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload de Foto da Peça no Supabase Storage */}
              <div className="space-y-2 border border-gray-200 rounded-2xl p-3.5 bg-gray-50">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-800">Foto da Peça (Supabase Storage)</label>
                  {image && image.includes('supabase.co') && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CloudUpload className="w-3 h-3" />
                      Hospedada na Nuvem
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {image ? (
                    <img src={image} alt="Preview" className="w-16 h-20 object-cover rounded-xl border border-gray-300 shrink-0 shadow-xs" />
                  ) : (
                    <div className="w-16 h-20 rounded-xl bg-gray-200 border border-dashed border-gray-400 flex items-center justify-center shrink-0 text-gray-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#0A1329]" />
                          <span>Enviando para o Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-[#0A1329]" />
                          <span>Escolher Foto do Computador / Celular</span>
                        </>
                      )}
                    </button>
                    
                    <input
                      type="url"
                      placeholder="Ou cole o link da foto (https://...)"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-[11px] text-gray-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Tecido / Composição</label>
                <input
                  type="text"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  placeholder="Ex: 100% Algodão Puro / Malha Canelada"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações adicionais sobre o caimento ou detalhes..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0A1329]"
                />
              </div>

              {/* Combo Eligible Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="combo"
                  checked={isComboEligible}
                  onChange={(e) => setIsComboEligible(e.target.checked)}
                  className="w-4 h-4 text-[#0A1329] rounded border-gray-300"
                />
                <label htmlFor="combo" className="font-semibold text-gray-700">
                  Participa da promoção "Combo 2 Pijamas por R$ 190"
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#0A1329] hover:bg-[#16264C] text-white font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Salvar Peça no Supabase
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Venda com Seleção de Tamanho */}
      {sellingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00B048]" />
                <h3 className="text-base font-black text-gray-900">
                  Registrar Venda
                </h3>
              </div>
              <button
                onClick={() => setSellingProduct(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <img
                src={sellingProduct.image}
                alt={sellingProduct.name}
                className="w-12 h-16 rounded-xl object-cover border border-gray-300 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-extrabold text-xs text-gray-900 truncate">
                  {sellingProduct.name}
                </p>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  {formatPrice(sellingProduct.price)} • {sellingProduct.category}
                </p>
                <p className="text-[11px] text-gray-400">
                  Custo: {formatPrice(sellingProduct.costPrice || 70)} | Lucro: <strong className="text-[#00B048]">{formatPrice(sellingProduct.price - (sellingProduct.costPrice || 70))}</strong>
                </p>
              </div>
            </div>

            {/* Seleção do Tamanho Vendido */}
            <div className="space-y-2">
              <label className="block font-extrabold text-xs text-gray-800">
                Qual tamanho foi vendido?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(sellingProduct.sizes || ['P', 'M', 'G', 'GG']).map((s) => {
                  const qty = sellingProduct.sizeStock ? (sellingProduct.sizeStock[s] || 0) : 0;
                  const isSelected = saleSize === s;

                  return (
                    <button
                      key={`quick-sale-sz-${s}`}
                      type="button"
                      onClick={() => setSaleSize(s)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A1329] text-white border-[#0A1329] shadow-xs'
                          : qty > 0
                          ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                          : 'bg-red-50/50 border-red-200 text-red-700'
                      }`}
                    >
                      <span className="block font-black text-sm">{s}</span>
                      <span className={`block text-[10px] ${isSelected ? 'text-[#D4AF37]' : qty > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                        {qty} em estoque
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagamento e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Forma de Pagamento</label>
                <select
                  value={salePayment}
                  onChange={(e) => setSalePayment(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold"
                >
                  <option value="pix">Pix</option>
                  <option value="cartao_link">Link Cartão (3x)</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Data da Venda</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSellingProduct(null)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickSale}
                className="px-6 py-2.5 rounded-xl bg-[#00B048] hover:bg-[#00963d] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido: Ajuste de Grade de Estoque */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-gray-900">
            {/* Header com miniatura da peça */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-gray-100">
              <img
                src={quickStockProduct.image}
                alt={quickStockProduct.name}
                className="w-14 h-16 rounded-xl object-cover border border-gray-200 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {quickStockProduct.category}
                </span>
                <h3 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-2 mt-1">
                  {quickStockProduct.name}
                </h3>
                <p className="text-xs font-black text-[#00B048] mt-0.5">
                  {formatPrice(quickStockProduct.price)}
                </p>
              </div>
            </div>

            {/* Grade de Tamanhos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  Quantidade contada por tamanho:
                </label>
                <span className="bg-[#0A1329] text-[#D4AF37] text-xs font-black px-2.5 py-0.5 rounded-full">
                  Total: {Object.values(tempSizeStock).reduce((a, b) => a + Number(b || 0), 0)} peças
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {['P', 'M', 'G', 'GG'].map((size) => (
                  <div key={size} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-black text-xs text-[#0A1329] bg-white px-2 py-1 rounded border border-gray-200 shadow-2xs">
                      {size}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTempSizeStock(prev => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-gray-200 border border-gray-200 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={tempSizeStock[size] ?? 0}
                        onChange={(e) => setTempSizeStock(prev => ({ ...prev, [size]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-12 text-center font-black text-sm bg-white rounded-lg border border-gray-300 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => setTempSizeStock(prev => ({ ...prev, [size]: (prev[size] || 0) + 1 }))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-gray-200 border border-gray-200 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setQuickStockProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickStock}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#00B048] hover:bg-[#00963d] text-white shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Grade</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Flutuante com Zoom da Foto ao passar o mouse */}
      {hoveredImage && (
        <div
          style={{ left: `${hoveredImage.x}px`, top: `${hoveredImage.y}px` }}
          className="fixed z-50 pointer-events-none bg-white rounded-2xl p-2.5 shadow-2xl border-2 border-[#0A1329]/20 animate-in fade-in zoom-in-95 duration-150 w-64 flex flex-col gap-2 ring-1 ring-black/10 transition-transform"
        >
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner">
            <img
              src={hoveredImage.url}
              alt={hoveredImage.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <ZoomIn className="w-3 h-3 text-[#D4AF37]" />
              <span>Zoom HD</span>
            </div>
          </div>
          <div className="px-1 pb-0.5">
            <p className="font-extrabold text-gray-900 text-xs line-clamp-2 leading-tight">
              {hoveredImage.name}
            </p>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px]">
              {hoveredImage.subtext && (
                <span className="text-gray-500 font-medium truncate max-w-[130px]">
                  {hoveredImage.subtext}
                </span>
              )}
              {hoveredImage.price !== undefined && (
                <span className="font-black text-[#0A1329] ml-auto">
                  {formatPrice(hoveredImage.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

