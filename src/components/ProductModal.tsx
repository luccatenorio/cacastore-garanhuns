import React, { useState } from 'react';
import { X, ShoppingBag, Bike, ShieldCheck, Tag } from 'lucide-react';
import { Product } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const availableSizes = product.sizes.filter(
    (s) => (product.sizeStock ? (product.sizeStock[s] ?? 1) > 0 : true)
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    availableSizes[0] || product.sizes[0] || 'M'
  );
  const [selectedImage, setSelectedImage] = useState<string>(product.image);
  const allImages = product.images && product.images.length > 0 ? product.images : [product.image];

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 20;

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Olá! Tenho interesse no *${product.name}* no tamanho *${selectedSize}* (${formatPrice(product.price)}). Ainda tem disponível para entrega hoje em Garanhuns?`
    );
    window.open(`https://wa.me/5531997584189?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 text-gray-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-xs hover:scale-105 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Photos Area */}
          <div className="p-6 bg-gray-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-xs relative">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 right-3">
                <span className="bg-[#00B048] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                  <Tag className="w-3 h-3 fill-current" />
                  {discountPercent}% OFF
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img ? 'border-[#0A1329] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Area */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#997316] font-bold block mb-1">
                {product.category}
              </span>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                {product.name}
              </h2>

              {/* Clean Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 font-medium mt-0.5">
                em até 3x de R$ {(product.price / 3).toFixed(2).replace('.', ',')} sem juros ou à vista no Pix
              </p>

              {/* Description & Fabric */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {product.description}
                </p>
                <p className="text-xs text-gray-900 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00B048]" />
                  Composição: {product.fabric}
                </p>
              </div>

              {/* Size Selector com Validação de Estoque por Tamanho */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Selecione seu tamanho:
                  </span>
                  {product.sizeStock && (
                    <span className="text-[11px] text-gray-500">
                      Disponível em estoque local
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {product.sizes.map((size) => {
                    const qty = product.sizeStock ? (product.sizeStock[size] ?? 1) : 1;
                    const isAvailable = qty > 0;
                    const isSelected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setSelectedSize(size)}
                        className={`h-9 min-w-9 px-3 rounded-lg text-xs font-bold transition-all relative ${
                          !isAvailable
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 opacity-50 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-[#0A1329] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                        }`}
                        title={!isAvailable ? `Tamanho ${size} esgotado` : `Tamanho ${size}: ${qty} disponível(is)`}
                      >
                        <span>{size}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Etiqueta sutil de Pouco Estoque (sem exibir o número de peças) */}
                {(() => {
                  const selectedQty = product.sizeStock ? (product.sizeStock[selectedSize] ?? 1) : 1;
                  if (selectedQty > 0 && selectedQty <= 2) {
                    return (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-amber-800 font-bold bg-amber-50/90 border border-amber-200/70 px-2.5 py-1 rounded-lg animate-in fade-in">
                        <span>🔥</span>
                        <span>Pouco estoque no tamanho {selectedSize} • Garanta o seu!</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Delivery Assurance com Motinha */}
              <div className="mt-5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-emerald-200/50 flex items-center justify-center shrink-0 text-xl">
                  🛵
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>Entrega Express em Garanhuns</span>
                    <span className="bg-[#00B048] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Hoje</span>
                  </p>
                  <p className="text-emerald-800 text-[11px] font-medium">Receba na sua porta via motoboy hoje ou em até 24h!</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  onAddToCart(product, selectedSize);
                  onClose();
                }}
                className="flex-1 bg-[#0A1329] hover:bg-[#16264C] text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Colocar na Sacola</span>
              </button>

              <button
                onClick={handleWhatsAppDirect}
                className="bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                title="Comprar direto no WhatsApp"
              >
                <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5 text-white fill-white" />
                <span className="hidden sm:inline">Pedir no Whats</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
