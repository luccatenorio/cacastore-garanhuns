import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { Navbar } from './components/Navbar';
import { HeroCarousel } from './components/HeroCarousel';
import { MarqueeBanner } from './components/MarqueeBanner';
import { CategoryBanners } from './components/CategoryBanners';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { ComboCard } from './components/ComboCard';
import { ComboModal } from './components/ComboModal';
import { Promo190Modal } from './components/Promo190Modal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { AdminPanel } from './components/admin/AdminPanel';
import { Product, CartItem, Combo } from './types';
import { getProducts, getCategories, getCategoriesAsync, getCombos } from './lib/storage';
import { Zap, Gift, Sparkles, Check, ArrowRight, X, Filter } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<string[]>(() => ['Todos', ...getCategories()]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSize, setSelectedSize] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [addedToast, setAddedToast] = useState<{ productName: string; size?: string } | null>(null);

  // Promoção Forte: 2 Pijamas por R$ 190 (Pop-up de entrada e Seletor Dinâmico)
  const [isPromo190Open, setIsPromo190Open] = useState(false);
  const [promo190InitialMode, setPromo190InitialMode] = useState<'welcome' | 'selector'>('welcome');

  const bestSellersRef = useRef<HTMLDivElement>(null);
  const combosRef = useRef<HTMLDivElement>(null);
  const allProductsRef = useRef<HTMLDivElement>(null);

  // Check URL params for admin: accessible strictly via /admin or #admin
  useEffect(() => {
    const checkAdmin = () => {
      const params = new URLSearchParams(window.location.search);
      if (
        params.has('admin') ||
        window.location.hash === '#admin' ||
        window.location.pathname.startsWith('/admin')
      ) {
        setIsAdminView(true);
      } else {
        setIsAdminView(false);
      }
    };

    checkAdmin();
    window.addEventListener('hashchange', checkAdmin);
    return () => window.removeEventListener('hashchange', checkAdmin);
  }, []);

  // Load products, combos & categories
  const fetchProducts = async () => {
    setLoading(true);
    const data = await getProducts();
    const cats = await getCategoriesAsync();
    const comboList = await getCombos();
    setProducts(data);
    setCombos(comboList);
    setCategories(['Todos', ...cats]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [isAdminView]);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cacastore_cart');
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao ler carrinho', e);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cacastore_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Auto-dismiss do aviso de item adicionado à sacola
  useEffect(() => {
    if (!addedToast) return;
    const timer = setTimeout(() => {
      setAddedToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [addedToast]);

  // Pop-up automático ao entrar no site anunciando: 2 Pijamas por R$ 190
  useEffect(() => {
    if (!isAdminView) {
      const hasSeen = sessionStorage.getItem('cacastore_seen_promo190_welcome');
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setPromo190InitialMode('welcome');
          setIsPromo190Open(true);
          sessionStorage.setItem('cacastore_seen_promo190_welcome', 'true');
        }, 1100);
        return () => clearTimeout(timer);
      }
    }
  }, [isAdminView]);

  const handleOpenPromo190 = (initial: 'welcome' | 'selector' = 'selector') => {
    setPromo190InitialMode(initial);
    setIsPromo190Open(true);
  };

  // Apenas peças com estoque ativo (> 0) aparecem no catálogo público
  const inStockProducts = useMemo(() => {
    return products.filter((p) => (p.stock || 0) > 0);
  }, [products]);

  // Combos ativos na vitrine
  const activeCombos = useMemo(() => {
    return combos.filter((c) => c.isActive !== false);
  }, [combos]);

  // Filtragem para o catálogo completo (Categoria, Tamanho e Busca)
  const filteredProducts = useMemo(() => {
    let result = [...inStockProducts];

    // 1. Filtro por Categoria
    if (selectedCategory !== 'Todos') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 2. Filtro por Tamanho (peças que possuem estoque > 0 no tamanho escolhido)
    if (selectedSize !== 'Todos') {
      result = result.filter((p) => {
        if (selectedSize === 'Plus Size') {
          const s = p.sizeStock || {};
          return (
            (s['Plus Size'] || 0) > 0 ||
            (s['G1'] || 0) > 0 ||
            (s['G2'] || 0) > 0 ||
            p.name.toLowerCase().includes('plus') ||
            p.sizes?.some((sz) => sz.toLowerCase().includes('plus') || sz === 'G1' || sz === 'G2')
          );
        }
        return (
          (p.sizeStock?.[selectedSize] || 0) > 0 ||
          (!p.sizeStock && p.sizes?.includes(selectedSize))
        );
      });
    }

    // 3. Filtro por Busca de texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [inStockProducts, selectedCategory, selectedSize, searchQuery]);

  // Mais vendidos curados (somente PIJAMAS em estoque, zero itens de academia)
  const bestSellers = useMemo(() => {
    // Filtrar estritamente apenas pijamas (excluindo academia/fitness a pedido)
    const pajamaProducts = inStockProducts.filter(
      (p) =>
        p.category !== 'Moda Fitness' &&
        !p.category.toLowerCase().includes('fitness') &&
        !p.name.toLowerCase().includes('academia') &&
        !p.name.toLowerCase().includes('top de') &&
        !p.name.toLowerCase().includes('top curto') &&
        !p.name.toLowerCase().includes('regata')
    );

    // Modelos de destaque exclusivos de pijamas com estoque ativo e alta procura
    const preferredFeaturedNames = [
      'Pijama Americano Coração', // Pijamas Americanos
      'Pijama Alcinha Gatinho Rosa', // Babydolls
      'Pijama Comprido Stich', // Pijamas Longos e Inverno
      'Pijama Americano Cereja', // Pijamas Americanos
      'Pijama Suede Ursos Amarelo', // Babydolls
      'Pijama Americano Xadrez Coração', // Pijamas Americanos
      'Camisola Americana Rosa', // Camisolas
      'Pijama Masculino Cumprido Cinza  c Vinho', // Masculino
    ];

    const selected: Product[] = [];

    // 1º: Incluir produtos preferidos da lista que tenham estoque
    for (const name of preferredFeaturedNames) {
      const match = pajamaProducts.find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && !selected.some((s) => s.id === p.id)
      );
      if (match && selected.length < 4) {
        selected.push(match);
      }
    }

    // 2º: Fallback caso falte algum para completar 4 peças de pijama
    if (selected.length < 4) {
      for (const p of pajamaProducts) {
        if (!selected.some((s) => s.id === p.id)) {
          selected.push(p);
          if (selected.length >= 4) break;
        }
      }
    }

    return selected;
  }, [inStockProducts]);

  // Cart operations
  const handleAddToCart = (product: Product, selectedSize: string) => {
    const availableStock = product.sizeStock && product.sizeStock[selectedSize] !== undefined
      ? product.sizeStock[selectedSize]
      : (product.stock || 1);

    if (availableStock <= 0) {
      alert(`O tamanho ${selectedSize} deste modelo está esgotado no momento!`);
      return;
    }

    let reachedLimit = false;

    setCartItems((prev) => {
      const existing = prev.find(
        (it) => it.id === product.id && it.selectedSize === selectedSize
      );
      if (existing) {
        if (existing.quantity >= availableStock) {
          reachedLimit = true;
          return prev;
        }
        return prev.map((it) =>
          it.id === product.id && it.selectedSize === selectedSize
            ? { ...it, quantity: it.quantity + 1 }
            : it
        );
      }
      return [...prev, { ...product, selectedSize, quantity: 1 }];
    });

    if (reachedLimit) {
      alert(`Você já adicionou o limite disponível para este tamanho (${availableStock} un).`);
      return;
    }

    // Notificação fluida na tela - cliente continua no site escolhendo mais!
    setAddedToast({
      productName: product.name,
      size: selectedSize,
    });
  };

  const handleAddComboToCart = (comboItem: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (it) => it.id === comboItem.id && it.selectedSize === comboItem.selectedSize
      );
      if (existing) {
        return prev.map((it) =>
          it.id === comboItem.id && it.selectedSize === comboItem.selectedSize
            ? { ...it, quantity: it.quantity + 1 }
            : it
        );
      }
      return [...prev, comboItem];
    });

    // Notificação fluida na tela
    setAddedToast({
      productName: comboItem.name,
      size: comboItem.selectedSize,
    });
  };

  const handleUpdateQuantity = (id: string, size: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id && it.selectedSize === size) {
            const availableStock = it.sizeStock && it.sizeStock[size] !== undefined
              ? it.sizeStock[size]
              : (it.stock || 99);

            const newQ = it.quantity + delta;
            if (delta > 0 && newQ > availableStock) {
              alert(`Limite atingido! Temos apenas ${availableStock} peça(s) no tamanho ${size} em estoque.`);
              return it;
            }
            return newQ > 0 ? { ...it, quantity: newQ } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string, size: string) => {
    setCartItems((prev) =>
      prev.filter((it) => !(it.id === id && it.selectedSize === size))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const scrollToSection = (id: string) => {
    if (id === 'mais-vendidos') {
      bestSellersRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'combo-promocao' || id === 'combos') {
      if (combosRef.current) {
        combosRef.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        allProductsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (id === 'toda-colecao') {
      allProductsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCategoryAndScroll = (cat: string) => {
    setSelectedCategory(cat);
    allProductsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // If in Admin URL, render dedicated Admin Panel
  if (isAdminView) {
    return (
      <AdminPanel
        onExit={() => {
          setIsAdminView(false);
          window.location.hash = '';
          window.history.pushState({}, '', '/');
          fetchProducts();
        }}
      />
    );
  }

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      
      {/* 1. Top Bar */}
      <TopBar />

      {/* 2. Clean Navbar (sem botão de cadastro público) */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectCategory={handleSelectCategoryAndScroll}
        onScrollToSection={scrollToSection}
        onOpenPromo190={() => handleOpenPromo190('selector')}
      />

      {/* 3. Hero Carousel (2 Fotos Grandes Passando com Autoplay) */}
      <HeroCarousel
        onScrollToSection={scrollToSection}
        onOpenPromo190={() => handleOpenPromo190('selector')}
      />

      {/* 4. Marquee Banner Maior e Ultra Legível */}
      <MarqueeBanner />

      {/* 4.5 Botão Fácil & Faixa Chamativa da Promoção Forte: 2 Pijamas por R$ 190 */}
      <div className="bg-gradient-to-r from-[#0A1329] via-[#16264C] to-[#0A1329] border-y border-[#D4AF37]/50 py-2.5 sm:py-3 px-4 shadow-md sticky top-[72px] sm:top-[88px] md:top-[104px] z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="bg-[#D4AF37] text-[#0A1329] text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
              Promoção Forte
            </span>
            <p className="text-xs sm:text-sm font-black text-white">
              2 Pijamas por <span className="text-[#D4AF37] text-sm sm:text-base font-black">R$ 190,00</span>
              <span className="hidden md:inline font-semibold text-[#F6E6B4] ml-2">• Economia de até R$ 30 + Frete Grátis Garanhuns</span>
            </p>
          </div>

          <button
            onClick={() => handleOpenPromo190('selector')}
            className="bg-[#D4AF37] hover:bg-[#F6E6B4] text-[#0A1329] font-black text-xs uppercase tracking-wider px-4 sm:px-5 py-2 rounded-full transition-all shadow-lg hover:scale-104 active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 fill-[#0A1329]" />
            <span>Clique para Selecionar Modelos</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* 5. Section: Mais Vendidos (Clone Exato Pandite) */}
      <section ref={bestSellersRef} id="mais-vendidos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Mais vendidos
          </h2>

          <button
            onClick={() => scrollToSection('toda-colecao')}
            className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Ver Mais
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400 text-xs">Carregando mais vendidos...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {bestSellers.map((product) => (
              <ProductCard
                key={`bestseller-${product.id}`}
                product={product}
                onAddToCart={handleAddToCart}
                onOpenDetails={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Nossas Coleções (Category Banners) */}
      <CategoryBanners onSelectCategory={handleSelectCategoryAndScroll} />

      {/* 7. Banner Promocional de Combo */}
      <div id="combo-promocao" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
        <div className="rounded-2xl sm:rounded-3xl bg-[#0A1329] text-white p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="space-y-3 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 bg-[#D4AF37] text-[#0A1329] text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Oferta Especial
            </span>
            <h3 className="text-xl sm:text-3xl font-black">
              Combo 2 Peças a partir de <span className="text-[#D4AF37]">R$ 190,00</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 max-w-lg leading-relaxed">
              Leve 2 peças exclusivas com desconto especial aplicado na hora. Você ganha <strong>frete grátis na sua porta em Garanhuns</strong> e pode pagar em até 3x sem juros!
            </p>
          </div>

          <button
            onClick={() => handleOpenPromo190('selector')}
            className="bg-[#D4AF37] hover:bg-[#F6E6B4] text-[#0A1329] font-black text-xs uppercase tracking-wider px-6 sm:px-8 py-3.5 rounded-full transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer flex items-center gap-2"
          >
            <Gift className="w-4 h-4 text-[#0A1329]" />
            <span>Selecionar Meus 2 Pijamas (R$ 190)</span>
          </button>
        </div>
      </div>

      {/* 7.5 Seção de Cards de Combos em Destaque */}
      {activeCombos.length > 0 && (
        <section ref={combosRef} id="combos-promocionais" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#997316] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                Kits Promocionais
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Combos & Kits Especiais
              </h2>
            </div>

            <span className="text-xs sm:text-sm font-semibold text-[#00B048] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              🏷️ Frete Grátis em Garanhuns
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeCombos.map((combo) => (
              <ComboCard
                key={`combo-${combo.id}`}
                combo={combo}
                onOpenComboModal={setSelectedCombo}
              />
            ))}
          </div>
        </section>
      )}

      {/* 8. Toda a Coleção (com Filtros de Categoria) */}
      <section ref={allProductsRef} id="toda-colecao" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#997316]">
            Estoque Local
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            Toda a Coleção
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Escolha suas peças e finalize seu pedido diretamente pelo WhatsApp
          </p>
        </div>

        {/* Filtro por Tamanho com Legenda Clara */}
        <div className="bg-gradient-to-r from-amber-50/90 via-[#FDFBF7] to-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black uppercase tracking-wider text-[#997316]">
                <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Filtre pelo seu Tamanho</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
                Toque no seu tamanho para ver apenas os modelos com pronta entrega em Garanhuns:
              </p>
            </div>

            {selectedSize !== 'Todos' && (
              <button
                onClick={() => setSelectedSize('Todos')}
                className="text-xs font-bold text-[#997316] hover:text-[#0A1329] underline cursor-pointer shrink-0 transition-colors"
              >
                Limpar tamanho ({selectedSize})
              </button>
            )}
          </div>

          {/* Botões de Tamanho */}
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 flex-wrap mt-3.5 pt-3 border-t border-amber-100">
            {['Todos', 'P', 'M', 'G', 'GG', 'Plus Size'].map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[50px] sm:min-w-[62px] h-10 sm:h-11 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95 ${
                    isSelected
                      ? 'bg-[#0A1329] text-[#D4AF37] ring-2 ring-[#D4AF37] scale-105 shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-950 border border-gray-200'
                  }`}
                >
                  <span>{size === 'Todos' ? 'Todos os Tamanhos' : size}</span>
                </button>
              );
            })}
          </div>

          {selectedSize !== 'Todos' && (
            <div className="mt-3 text-center text-xs font-semibold text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200/70 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Mostrando apenas peças com estoque no tamanho <strong>{selectedSize}</strong> ({filteredProducts.length} modelo{filteredProducts.length === 1 ? '' : 's'} disponível{filteredProducts.length === 1 ? '' : 'is'})
              </span>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap mb-8 sm:mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0A1329] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="py-24 text-center text-gray-400 text-xs">Carregando catálogo completo...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onOpenDetails={setSelectedProduct}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-sm space-y-3">
            <p>
              {selectedSize !== 'Todos'
                ? `Nenhuma peça em estoque encontrada no tamanho ${selectedSize} para esta seleção.`
                : 'Nenhuma peça encontrada para esta categoria.'}
            </p>
            {selectedSize !== 'Todos' && (
              <button
                onClick={() => setSelectedSize('Todos')}
                className="px-5 py-2.5 bg-[#0A1329] text-[#D4AF37] text-xs font-black rounded-full hover:bg-black transition-all cursor-pointer shadow-sm"
              >
                Ver todos os tamanhos disponíveis
              </button>
            )}
          </div>
        )}
      </section>

      {/* 9. Footer */}
      <Footer />

      {/* 10. Product Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* 10.5 Combo Modal */}
      <ComboModal
        combo={selectedCombo}
        onClose={() => setSelectedCombo(null)}
        onAddToCart={handleAddComboToCart}
      />

      {/* 11. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      {/* 12. Floating WhatsApp */}
      <FloatingWhatsApp />

      {/* 13. Toast Flutuante ao Adicionar Peça (Permite continuar navegando facilmente) */}
      {addedToast && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A1329] text-white px-4 sm:px-6 py-3.5 rounded-2xl shadow-2xl border border-[#D4AF37]/50 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-6 duration-300 max-w-md w-[92vw]">
          <div className="w-9 h-9 rounded-full bg-[#00B048] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-extrabold truncate text-white leading-tight">
              {addedToast.productName}
            </p>
            <p className="text-[#F6E6B4] text-[11px] font-semibold mt-0.5">
              {addedToast.size ? `Tamanho ${addedToast.size} • ` : ''}Adicionado à sacola!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setAddedToast(null);
                setIsCartOpen(true);
              }}
              className="bg-[#D4AF37] hover:bg-[#F6E6B4] text-[#0A1329] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1 active:scale-95"
            >
              <span>Ver Sacola</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAddedToast(null)}
              className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
              title="Continuar no site"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 14. Pop-up Dinâmico & Seletor de Modelos: 2 Pijamas por R$ 190 */}
      <Promo190Modal
        isOpen={isPromo190Open}
        initialMode={promo190InitialMode}
        products={inStockProducts}
        onClose={() => setIsPromo190Open(false)}
        onAddToCart={handleAddComboToCart}
      />

    </div>
  );
}
