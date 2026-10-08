import React, { useState } from 'react';
import { X, ShoppingBag, Bike, ShieldCheck, Tag, Plus, Check } from 'lucide-react';
import { Combo, CartItem } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';

interface ComboModalProps {
  combo: Combo | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ComboModal: React.FC<ComboModalProps> = ({ combo, onClose, onAddToCart }) => {
  if (!combo) return null;

  const [size1, setSize1] = useState<string>('M');
  const [size2, setSize2] = useState<string>('M');
  const availableSizes = ['P', 'M', 'G', 'GG'];

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const originalPrice = combo.originalPrice || combo.comboPrice * 1.15;
  const comboPrice = combo.comboPrice;
  const discountAmount = Math.max(0, originalPrice - comboPrice);
  const discountPercent = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 15;
  const installmentValue = (comboPrice / 3).toFixed(2).replace('.', ',');

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Olá! Tenho interesse no *${combo.name}*:\n` +
      `• Peça 1: ${combo.product1Name} (Tamanho: *${size1}*)\n` +
      `• Peça 2: ${combo.product2Name} (Tamanho: *${size2}*)\n` +
      `Valor promocional do Combo: *${formatPrice(comboPrice)}* (Economia de ${formatPrice(discountAmount)}).\n` +
      `Ainda tem disponível para entrega em Garanhuns?`
    );
    window.open(`https://wa.me/5531997584189?text=${text}`, '_blank');
  };

  const handleAddComboToCart = () => {
    // Adiciona o combo como um item especial ou como 2 itens agrupados
    const comboCartItem: CartItem = {
      id: combo.id,
      name: `${combo.name} (${size1} + ${size2})`,
      category: 'Combos Promocionais',
      price: combo.comboPrice,
      originalPrice: combo.originalPrice,
      sizes: [size1, size2],
      stock: 10,
      image: combo.product1Image,
      images: [combo.product1Image, combo.product2Image],
      description: `Peça 1: ${combo.product1Name} (Tam ${size1}) + Peça 2: ${combo.product2Name} (Tam ${size2})`,
      fabric: '100% Algodão Puro Premium',
      badge: combo.badge || 'Frete Grátis',
      selectedSize: `${size1} + ${size2}`,
      quantity: 1,
    };

    onAddToCart(comboCartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 text-gray-900 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-100/90 text-gray-600 hover:bg-gray-200 shadow-xs hover:scale-105 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-4 sm:p-8 space-y-6">
          
          {/* Top Header */}
          <div className="space-y-1 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#0A1329] text-[#D4AF37] text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                {combo.badge || 'Oferta de Combo'}
              </span>
              <span className="bg-[#00B048] text-white text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Tag className="w-3 h-3 fill-current" />
                {discountPercent}% OFF
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {combo.name}
            </h2>
            {combo.description && (
              <p className="text-xs sm:text-sm text-gray-600">
                {combo.description}
              </p>
            )}
          </div>

          {/* Double Products Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            
            {/* Item 1 */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col justify-between space-y-3">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 relative">
                <img
                  src={combo.product1Image}
                  alt={combo.product1Name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-[#0A1329]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Peça 1
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  {combo.product1Name}
                </p>
                <div className="mt-2.5">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Escolha o Tamanho da Peça 1:
                  </label>
                  <div className="flex gap-1.5">
                    {availableSizes.map((s) => (
                      <button
                        key={`p1-${s}`}
                        type="button"
                        onClick={() => setSize1(s)}
                        className={`w-9 h-9 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          size1 === s
                            ? 'bg-[#0A1329] text-white ring-2 ring-[#0A1329]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col justify-between space-y-3">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 relative">
                <img
                  src={combo.product2Image}
                  alt={combo.product2Name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-[#0A1329]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Peça 2
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  {combo.product2Name}
                </p>
                <div className="mt-2.5">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Escolha o Tamanho da Peça 2:
                  </label>
                  <div className="flex gap-1.5">
                    {availableSizes.map((s) => (
                      <button
                        key={`p2-${s}`}
                        type="button"
                        onClick={() => setSize2(s)}
                        className={`w-9 h-9 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          size2 === s
                            ? 'bg-[#0A1329] text-white ring-2 ring-[#0A1329]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Pricing Details */}
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-xs text-gray-600">
                Preço normal das 2 peças avulsas:{' '}
                <span className="line-through text-gray-400 font-semibold">{formatPrice(originalPrice)}</span>
              </p>
              <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-gray-950">
                  {formatPrice(comboPrice)}
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  em até 3x de <strong>R$ {installmentValue}</strong>
                </span>
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="bg-[#00B048] text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs shrink-0">
                Você economiza {formatPrice(discountAmount)}
              </div>
            )}
          </div>

          {/* Value props */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-[#0A1329] shrink-0" />
              <span>Entrega Grátis na sua porta em Garanhuns</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00B048] shrink-0" />
              <span>100% Algodão Puro & Pronta Entrega</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleAddComboToCart}
              className="w-full py-3.5 rounded-2xl bg-[#0A1329] hover:bg-[#16264C] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
            >
              <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
              <span>Adicionar Combo à Sacola ({size1} + {size2})</span>
            </button>

            <button
              onClick={handleWhatsAppDirect}
              className="w-full py-3.5 rounded-2xl border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5" />
              <span>Pedir Combo Direto no WhatsApp</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
