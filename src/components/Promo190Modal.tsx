import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, ShoppingBag, Sparkles, Gift, Zap, ArrowRight, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { Product, CartItem } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';

interface Promo190ModalProps {
  isOpen: boolean;
  initialMode?: 'welcome' | 'selector';
  products: Product[];
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const Promo190Modal: React.FC<Promo190ModalProps> = ({
  isOpen,
  initialMode = 'welcome',
  products,
  onClose,
  onAddToCart,
}) => {
  const [mode, setMode] = useState<'welcome' | 'selector'>(initialMode);

  // Sincronizar mode com initialMode ao abrir
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Filtrar apenas produtos elegíveis (pijamas americanos e babydolls com estoque)
  const eligibleProducts = useMemo(() => {
    return products.filter((p) => {
      const isPijama =
        p.category === 'Pijamas Americanos' ||
        p.category === 'Babydolls' ||
        p.category.toLowerCase().includes('pijama') ||
        p.category.toLowerCase().includes('alcinha') ||
        p.isComboEligible !== false;
      return isPijama && (p.stock || 0) > 0;
    });
  }, [products]);

  // Estados de seleção dos dois pijamas
  const [selectedProd1Id, setSelectedProd1Id] = useState<string>('');
  const [selectedProd2Id, setSelectedProd2Id] = useState<string>('');
  const [size1, setSize1] = useState<string>('M');
  const [size2, setSize2] = useState<string>('M');

  // Inicializar seleções com os 2 primeiros produtos disponíveis
  useEffect(() => {
    if (eligibleProducts.length > 0) {
      if (!selectedProd1Id || !eligibleProducts.some((p) => p.id === selectedProd1Id)) {
        const first = eligibleProducts[0];
        setSelectedProd1Id(first.id);
        const availSizes = getAvailableSizes(first);
        setSize1(availSizes[0] || 'M');
      }

      if (!selectedProd2Id || !eligibleProducts.some((p) => p.id === selectedProd2Id)) {
        const second = eligibleProducts[1] || eligibleProducts[0];
        setSelectedProd2Id(second.id);
        const availSizes = getAvailableSizes(second);
        setSize2(availSizes[0] || 'M');
      }
    }
  }, [eligibleProducts]);

  // Helper para obter tamanhos com estoque positivo
  function getAvailableSizes(prod: Product | undefined): string[] {
    if (!prod) return ['P', 'M', 'G', 'GG'];
    const all = prod.sizes || ['P', 'M', 'G', 'GG'];
    if (!prod.sizeStock) return all;
    const withStock = all.filter((s) => (prod.sizeStock ? (prod.sizeStock[s] || 0) > 0 : true));
    return withStock.length > 0 ? withStock : all;
  }

  const prod1 = eligibleProducts.find((p) => p.id === selectedProd1Id) || eligibleProducts[0];
  const prod2 = eligibleProducts.find((p) => p.id === selectedProd2Id) || eligibleProducts[1] || eligibleProducts[0];

  const prod1Sizes = getAvailableSizes(prod1);
  const prod2Sizes = getAvailableSizes(prod2);

  // Troca de produto 1
  const handleSelectProd1 = (p: Product) => {
    setSelectedProd1Id(p.id);
    const avail = getAvailableSizes(p);
    if (!avail.includes(size1)) {
      setSize1(avail[0] || 'M');
    }
  };

  // Troca de produto 2
  const handleSelectProd2 = (p: Product) => {
    setSelectedProd2Id(p.id);
    const avail = getAvailableSizes(p);
    if (!avail.includes(size2)) {
      setSize2(avail[0] || 'M');
    }
  };

  const originalTotal = (prod1?.price || 109.99) + (prod2?.price || 109.99);
  const promoPrice = 190.0;
  const savings = Math.max(0, originalTotal - promoPrice);

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Adicionar ao Carrinho
  const handleConfirmComboToCart = () => {
    if (!prod1 || !prod2) return;

    // Verificar se selecionou mesma peça e mesmo tamanho com apenas 1 unidade disponível
    if (prod1.id === prod2.id && size1 === size2) {
      const available = prod1.sizeStock ? (prod1.sizeStock[size1] || 0) : prod1.stock;
      if (available < 2) {
        alert(
          `Aviso: Temos apenas 1 unidade em estoque do tamanho ${size1} neste modelo. Por favor, escolha outro tamanho ou modelo para o 2º pijama.`
        );
        return;
      }
    }

    const comboItem: CartItem = {
      id: `combo-custom-${Date.now()}`,
      name: `Combo 2 Pijamas (${prod1.name} + ${prod2.name})`,
      category: 'Combos Promocionais',
      price: promoPrice,
      originalPrice: originalTotal,
      sizes: [size1, size2],
      stock: 10,
      image: prod1.image,
      images: [prod1.image, prod2.image],
      description: `1. ${prod1.name} (Tam ${size1}) + 2. ${prod2.name} (Tam ${size2})`,
      fabric: '100% Algodão Puro Premium',
      badge: 'Frete Grátis Garanhuns',
      selectedSize: `${size1} + ${size2}`,
      quantity: 1,
    };

    onAddToCart(comboItem);
    onClose();
  };

  // Enviar direto pelo WhatsApp
  const handleSendWhatsApp = () => {
    if (!prod1 || !prod2) return;

    const message =
      `🌸 *PEDIDO COMBO 2 PIJAMAS POR R$ 190* 🌸\n\n` +
      `Olá! Quero aproveitar a promoção de 2 Pijamas por R$ 190,00 da Caca Store:\n\n` +
      `• *Pijama 1:* ${prod1.name} (Tamanho: *${size1}*)\n` +
      `• *Pijama 2:* ${prod2.name} (Tamanho: *${size2}*)\n\n` +
      `💰 *Total:* R$ 190,00 (Economia de ${formatPrice(savings)})\n` +
      `📦 *Entrega:* Entrega Expressa Hoje em Garanhuns (Grátis)\n\n` +
      `_Podem confirmar meu pedido?_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5531997584189?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 text-gray-900 animate-in zoom-in-95 duration-200 cursor-default max-h-[92vh] flex flex-col"
      >
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#0A1329]/80 hover:bg-[#0A1329] text-white flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-md"
          title="Fechar"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* ========================================================
            MODO 1: POP-UP DE BOAS-VINDAS (CHAMATIVO E IMPACTANTE)
           ======================================================== */}
        {mode === 'welcome' && (
          <div className="overflow-y-auto flex flex-col md:flex-row">
            {/* Foto Real das Modelos no Banner 2 Pijamas */}
            <div className="relative md:w-1/2 aspect-[4/3] md:aspect-auto min-h-[260px] md:min-h-[440px] bg-[#0A1329] overflow-hidden">
              <img
                src="/banner-combo-pijamas.jpg"
                alt="Promoção 2 Pijamas por R$ 190 Caca Store"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1329] via-transparent to-transparent md:hidden" />
              
              {/* Badge Flutuante na Foto */}
              <div className="absolute top-4 left-4 bg-[#0A1329]/85 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/50 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-[#D4AF37]" />
                <span>Oferta de Lançamento</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-semibold bg-black/60 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 hidden md:block">
                <span className="text-[#00B048] font-bold">✓ Pijamas Reais da Foto:</span> 100% Algodão Puro com entrega hoje em Garanhuns.
              </div>
            </div>

            {/* Conteúdo & Chamada da Promoção */}
            <div className="p-6 sm:p-8 md:w-1/2 flex flex-col justify-between space-y-5 bg-gradient-to-b from-white to-gray-50">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-[#00B048]/10 text-[#008f3a] text-xs font-black px-3 py-1 rounded-full border border-[#00B048]/30">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Promoção Mais Forte do Catálogo</span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-black text-gray-950 leading-tight">
                  Leve 2 Pijamas por apenas <br />
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#00B048]">
                    R$ 190,00
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Monte seu kit com os seus <strong>modelos e tamanhos favoritos</strong> (americanos ou alcinha). De R$ 220 por apenas R$ 190 com <strong>Frete Grátis na sua porta hoje em Garanhuns!</strong>
                </p>

                {/* Vantagens */}
                <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-[#00B048] shrink-0" />
                    <span><strong>100% Algodão Puro:</strong> tecido macio, fresquinho e elegante.</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-[#00B048] shrink-0" />
                    <span><strong>Entrega Expressa Grátis:</strong> receba via motoboy hoje mesmo.</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-[#00B048] shrink-0" />
                    <span><strong>Pix ou Cartão:</strong> parcele em até 3x sem juros.</span>
                  </div>
                </div>
              </div>

              {/* Botão de Ação para Abrir o Seletor Interativo */}
              <div className="space-y-2 pt-3">
                <button
                  onClick={() => setMode('selector')}
                  className="w-full bg-[#0A1329] hover:bg-[#16264C] text-[#D4AF37] hover:text-white py-4 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl hover:shadow-[#D4AF37]/20 flex items-center justify-center gap-2 group cursor-pointer active:scale-98 border-2 border-[#D4AF37]/40"
                >
                  <Sparkles className="w-4 h-4 fill-[#D4AF37] group-hover:rotate-12 transition-transform" />
                  <span>Clique para Selecionar Modelos</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-700 font-semibold py-1.5 transition-colors cursor-pointer"
                >
                  Continuar navegando na vitrine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODO 2: SELETOR DINÂMICO DE MODELOS E TAMANHOS (INTERATIVO)
           ======================================================== */}
        {mode === 'selector' && (
          <div className="overflow-y-auto p-4 sm:p-7 space-y-6">
            
            {/* Header do Seletor */}
            <div className="text-center sm:text-left space-y-1 border-b border-gray-100 pb-4 pr-8">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 bg-[#0A1329] text-[#D4AF37] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <Gift className="w-3.5 h-3.5" />
                  <span>Monte seu Combo Especial</span>
                </div>
                <span className="text-xs font-black text-[#00B048] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Economia de {formatPrice(savings)}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                Selecione os 2 Pijamas & Tamanhos
              </h2>
              <p className="text-xs text-gray-500">
                Clique nos modelos abaixo para compor o seu kit de 2 peças por apenas <strong>R$ 190,00</strong>.
              </p>
            </div>

            {/* SEÇÃO 1: Escolha do 1º Pijama */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0A1329] text-white text-[11px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span>Escolha o 1º Pijama:</span>
                  <span className="text-xs font-extrabold text-[#00B048]">
                    {prod1?.name}
                  </span>
                </h3>
              </div>

              {/* Grid Horizontal de Modelos 1 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {eligibleProducts.map((p) => {
                  const isSelected = p.id === selectedProd1Id;
                  return (
                    <div
                      key={`prod1-${p.id}`}
                      onClick={() => handleSelectProd1(p)}
                      className={`relative rounded-xl p-2 bg-white border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#00B048] ring-2 ring-[#00B048]/30 shadow-md scale-102'
                          : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-1.5 relative">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#00B048] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 text-[11px] truncate leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{p.category}</p>
                    </div>
                  );
                })}
              </div>

              {/* Seletor de Tamanho da Peça 1 */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-700">Tamanho da Peça 1:</span>
                <div className="flex gap-2">
                  {['P', 'M', 'G', 'GG'].map((s) => {
                    const hasStock = prod1Sizes.includes(s);
                    const isSelected = size1 === s;
                    return (
                      <button
                        key={`size1-${s}`}
                        type="button"
                        disabled={!hasStock}
                        onClick={() => setSize1(s)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0A1329] text-white ring-2 ring-[#0A1329] shadow-sm scale-105'
                            : hasStock
                            ? 'bg-white border border-gray-300 text-gray-800 hover:border-gray-900'
                            : 'bg-gray-100 border border-gray-200 text-gray-300 line-through cursor-not-allowed opacity-50'
                        }`}
                        title={hasStock ? `Tamanho ${s}` : `Tamanho ${s} esgotado`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Escolha do 2º Pijama */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00B048] text-white text-[11px] font-black flex items-center justify-center">
                    2
                  </span>
                  <span>Escolha o 2º Pijama:</span>
                  <span className="text-xs font-extrabold text-[#00B048]">
                    {prod2?.name}
                  </span>
                </h3>
              </div>

              {/* Grid Horizontal de Modelos 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {eligibleProducts.map((p) => {
                  const isSelected = p.id === selectedProd2Id;
                  return (
                    <div
                      key={`prod2-${p.id}`}
                      onClick={() => handleSelectProd2(p)}
                      className={`relative rounded-xl p-2 bg-white border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#00B048] ring-2 ring-[#00B048]/30 shadow-md scale-102'
                          : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-1.5 relative">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#00B048] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 text-[11px] truncate leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{p.category}</p>
                    </div>
                  );
                })}
              </div>

              {/* Seletor de Tamanho da Peça 2 */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-700">Tamanho da Peça 2:</span>
                <div className="flex gap-2">
                  {['P', 'M', 'G', 'GG'].map((s) => {
                    const hasStock = prod2Sizes.includes(s);
                    const isSelected = size2 === s;
                    return (
                      <button
                        key={`size2-${s}`}
                        type="button"
                        disabled={!hasStock}
                        onClick={() => setSize2(s)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00B048] text-white ring-2 ring-[#00B048] shadow-sm scale-105'
                            : hasStock
                            ? 'bg-white border border-gray-300 text-gray-800 hover:border-gray-900'
                            : 'bg-gray-100 border border-gray-200 text-gray-300 line-through cursor-not-allowed opacity-50'
                        }`}
                        title={hasStock ? `Tamanho ${s}` : `Tamanho ${s} esgotado`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RESUMO DINÂMICO DO COMBO ESCOLHIDO */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0A1329] to-[#16264C] p-4 sm:p-5 text-white shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Visual das 2 Peças Selecionadas juntas */}
                <div className="flex items-center gap-3">
                  {/* Peça 1 */}
                  <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 border-white/20 shrink-0 bg-white">
                    <img src={prod1?.image} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-[#0A1329] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                      {size1}
                    </span>
                  </div>

                  {/* Sinal de Mais */}
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A1329] font-black text-sm flex items-center justify-center shrink-0">
                    +
                  </div>

                  {/* Peça 2 */}
                  <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 border-white/20 shrink-0 bg-white">
                    <img src={prod2?.image} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-[#00B048] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                      {size2}
                    </span>
                  </div>

                  <div className="text-left text-xs space-y-0.5 min-w-0">
                    <p className="font-extrabold text-white truncate max-w-[180px] sm:max-w-[240px]">
                      1. {prod1?.name}
                    </p>
                    <p className="font-extrabold text-[#F6E6B4] truncate max-w-[180px] sm:max-w-[240px]">
                      2. {prod2?.name}
                    </p>
                    <span className="text-[10px] text-gray-300 block">
                      Tamanhos: <strong>{size1}</strong> e <strong>{size2}</strong>
                    </span>
                  </div>
                </div>

                {/* Preço e Economia */}
                <div className="text-center sm:text-right shrink-0">
                  <div className="flex items-baseline justify-center sm:justify-end gap-2">
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(originalTotal)}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#D4AF37]">
                      {formatPrice(promoPrice)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#00B048] font-bold">
                    Economia de {formatPrice(savings)} • Frete Grátis
                  </p>
                  <p className="text-[10px] text-gray-400">ou 3x de R$ 63,33 sem juros</p>
                </div>

              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                <button
                  onClick={handleConfirmComboToCart}
                  className="bg-[#D4AF37] hover:bg-[#F6E6B4] text-[#0A1329] py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0A1329]" />
                  <span>Adicionar Combo à Sacola (R$ 190)</span>
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5 text-white fill-white" />
                  <span>Pedir Combo Direto no WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
