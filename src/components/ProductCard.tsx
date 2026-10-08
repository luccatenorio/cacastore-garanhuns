import React from 'react';
import { Eye, Tag } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, selectedSize: string) => void;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetails,
}) => {
  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 20;

  const installmentValue = (product.price / 3).toFixed(2).replace('.', ',');

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-300 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* 1. Image Area */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-300"
          loading="lazy"
        />

        {/* Green Discount Badge (Exact Pandite Style in Top Right) */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="bg-[#00B048] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
            <Tag className="w-3 h-3 fill-current" />
            {discountPercent}% OFF
          </span>
        </div>

        {/* Desktop Quick View on Hover */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
          <span className="bg-white/95 text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <Eye className="w-3.5 h-3.5 text-[#0A1329]" />
            Ver Detalhes
          </span>
        </div>
      </div>

      {/* 2. Content & Clean Price Area (Exact Pandite Pijamas Typography) */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between text-center space-y-2">
        <div>
          {/* Title */}
          <h3 className="text-xs sm:text-sm font-medium text-gray-800 leading-snug line-clamp-2 hover:text-[#0A1329] transition-colors">
            {product.name} - Caca Store
          </h3>
        </div>

        {/* Clean Price Block (Bold Price + Strikethrough + Installments) */}
        <div className="pt-0.5 space-y-0.5">
          <div className="flex items-center justify-center gap-2">
            {/* Main Bold Price */}
            <span className="text-lg sm:text-xl font-bold font-black text-gray-950">
              {formatPrice(product.price)}
            </span>

            {/* Original Price with Strikethrough */}
            {product.originalPrice && (
              <span className="text-xs text-gray-400 font-normal line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Installment note */}
          <p className="text-xs text-gray-700 font-normal">
            em até 3x de <strong className="font-bold text-gray-900">R$ {installmentValue}</strong>
          </p>
        </div>

        {/* Selo Entrega Express em Garanhuns com Motinha */}
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50/90 py-1.5 px-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
          <span className="text-sm">🛵</span>
          <span>Entrega Express em Garanhuns</span>
        </div>

      </div>
    </div>
  );
};
