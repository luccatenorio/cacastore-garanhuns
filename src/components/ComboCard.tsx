import React from 'react';
import { Tag, Sparkles, Plus, Check } from 'lucide-react';
import { Combo } from '../types';

interface ComboCardProps {
  combo: Combo;
  onOpenComboModal: (combo: Combo) => void;
}

export const ComboCard: React.FC<ComboCardProps> = ({ combo, onOpenComboModal }) => {
  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const originalPrice = combo.originalPrice || combo.comboPrice * 1.15;
  const comboPrice = combo.comboPrice;
  const discountAmount = Math.max(0, originalPrice - comboPrice);
  const discountPercent = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 15;
  const installmentValue = (comboPrice / 3).toFixed(2).replace('.', ',');

  return (
    <div
      onClick={() => onOpenComboModal(combo)}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-300 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer relative"
    >
      {/* 1. Header Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Badge: Dourado / Combo Especial */}
        <span className="bg-[#0A1329]/90 text-[#D4AF37] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs backdrop-blur-xs flex items-center gap-1 border border-[#D4AF37]/30">
          <Sparkles className="w-3 h-3 text-[#D4AF37]" />
          {combo.badge || 'Combo Promocional'}
        </span>

        {/* Right Badge: Estilo Pandite Verde Neon OFF */}
        <span className="bg-[#00B048] text-white text-[11px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
          <Tag className="w-3 h-3 fill-current" />
          {discountPercent}% OFF
        </span>
      </div>

      {/* 2. Double Image Area (Mostrando os 2 Produtos lado a lado) */}
      <div className="relative aspect-[4/3] sm:aspect-[3/2] bg-gray-100 overflow-hidden flex">
        {/* Product 1 Image */}
        <div className="w-1/2 h-full relative overflow-hidden border-r border-white/40">
          <img
            src={combo.product1Image}
            alt={combo.product1Name}
            className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate text-center">
            {combo.product1Name}
          </div>
        </div>

        {/* Floating Plus Badge in the Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0A1329] border-2 border-white text-[#D4AF37] shadow-lg flex items-center justify-center">
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Product 2 Image */}
        <div className="w-1/2 h-full relative overflow-hidden">
          <img
            src={combo.product2Image}
            alt={combo.product2Name}
            className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate text-center">
            {combo.product2Name}
          </div>
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between text-center space-y-3">
        <div className="space-y-1">
          {/* Title */}
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 hover:text-[#0A1329] transition-colors">
            {combo.name} - Caca Store
          </h3>

          {/* Description */}
          {combo.description && (
            <p className="text-[11px] text-gray-500 line-clamp-1">
              {combo.description}
            </p>
          )}

          {/* Items Summary Pills */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
              <Check className="w-2.5 h-2.5 text-[#00B048]" />
              {combo.product1Name.split(' ')[0]} {combo.product1Name.split(' ')[1] || ''}
            </span>
            <span className="text-gray-400 text-[10px] font-bold">+</span>
            <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
              <Check className="w-2.5 h-2.5 text-[#00B048]" />
              {combo.product2Name.split(' ')[0]} {combo.product2Name.split(' ')[1] || ''}
            </span>
          </div>
        </div>

        {/* Clean Price Block (Bold Price + Strikethrough + Installments) */}
        <div className="pt-1 border-t border-gray-100 space-y-1">
          <div className="flex items-center justify-center gap-2">
            {/* Main Bold Price */}
            <span className="text-lg sm:text-xl font-bold font-black text-gray-950">
              {formatPrice(comboPrice)}
            </span>

            {/* Original Price with Strikethrough */}
            {originalPrice > comboPrice && (
              <span className="text-xs text-gray-400 font-normal line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Savings Badge */}
          {discountAmount > 0 && (
            <div className="text-[11px] text-[#00B048] font-bold">
              Economia de {formatPrice(discountAmount)}
            </div>
          )}

          {/* Installment note */}
          <p className="text-[11px] sm:text-xs text-gray-600 font-normal">
            em até 3x de <strong className="font-bold text-gray-900">R$ {installmentValue}</strong>
          </p>

          {/* CTA Button */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              className="w-full py-2 px-3 rounded-xl bg-[#0A1329] group-hover:bg-[#16264C] text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Aproveitar Combo</span>
            </button>

            {/* Selo Entrega Express em Garanhuns com Motinha */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold text-emerald-800 bg-emerald-50/90 py-1.5 px-2 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-sm leading-none">🛵</span>
              <span>Entrega Express em Garanhuns</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
