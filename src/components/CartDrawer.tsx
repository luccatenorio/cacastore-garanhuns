import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, Zap, Clock, MapPin, CreditCard, Sparkles, ArrowRight } from 'lucide-react';
import { CartItem, DeliveryMethod, PaymentMethod } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, size: string, delta: number) => void;
  onRemoveItem: (id: string, size: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('normal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [customerName, setCustomerName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [referencePoint, setReferencePoint] = useState('');

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatPrice = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Combo calculation: 2 sleepwear items get R$ 20 off
  const eligiblePijamaCount = items
    .filter((item) => item.isComboEligible)
    .reduce((sum, item) => sum + item.quantity, 0);

  const comboPairs = Math.floor(eligiblePijamaCount / 2);
  const comboDiscount = comboPairs * 20;

  // Free shipping qualification (Combo or order >= R$ 190)
  const qualifiesForFreeNormalShipping = comboPairs > 0 || subtotal >= 190;

  // Delivery costs calculation:
  // Normal delivery: R$ 6.00 (or free with combo/promo)
  // Express delivery: R$ 10.00 (or R$ 4.00 difference with combo/promo)
  // Pickup: R$ 0.00
  let shippingCost = 0;
  if (deliveryMethod === 'expressa') {
    shippingCost = qualifiesForFreeNormalShipping ? 4.0 : 10.0;
  } else if (deliveryMethod === 'normal') {
    shippingCost = qualifiesForFreeNormalShipping ? 0.0 : 6.0;
  } else {
    shippingCost = 0.0;
  }

  const total = Math.max(0, subtotal - comboDiscount + shippingCost);

  const handleCheckoutWhatsApp = () => {
    if (items.length === 0) return;

    let itemsText = items
      .map(
        (it) =>
          `• *${it.name}* (Tam: ${it.selectedSize}) x${it.quantity} = ${formatPrice(
            it.price * it.quantity
          )}`
      )
      .join('\n');

    let deliveryLabel = '';
    if (deliveryMethod === 'expressa') {
      deliveryLabel = `⚡ *Entrega Expressa (Hoje / Poucas Horas)* - ${
        shippingCost === 0 ? 'GRÁTIS' : formatPrice(shippingCost)
      }`;
    } else if (deliveryMethod === 'normal') {
      deliveryLabel = `🚚 *Entrega em até 24h* - ${
        shippingCost === 0 ? 'GRÁTIS' : formatPrice(shippingCost)
      }`;
    } else {
      deliveryLabel = `📍 *Retirada no Local* (Grátis - combinar endereço)`;
    }

    let deliveryAddressText =
      deliveryMethod !== 'retirada'
        ? `\n📍 *Endereço:* ${address || 'A combinar'} - Bairro: ${
            neighborhood || 'Garanhuns'
          }\n🚩 *Ponto de Ref:* ${referencePoint || 'Nenhum informado'}`
        : '';

    let paymentText =
      paymentMethod === 'pix'
        ? `💠 *Forma de Pagamento:* Pix Imediato`
        : `💳 *Forma de Pagamento:* Link Cartão (em até 3x sem juros)`;

    let discountNotice =
      comboDiscount > 0
        ? `\n🎉 *Desconto Combo 2 Pijamas:* -${formatPrice(comboDiscount)}`
        : '';

    let message =
      `🌸 *NOVO PEDIDO - CACA STORE GARANHUNS* 🌸\n\n` +
      `👤 *Cliente:* ${customerName || 'Cliente'}\n\n` +
      `🛍️ *ITENS DO PEDIDO:*\n${itemsText}\n` +
      `${discountNotice}\n` +
      `📦 *Tipo de Entrega:* ${deliveryLabel}${deliveryAddressText}\n\n` +
      `${paymentText}\n\n` +
      `💰 *VALOR TOTAL: ${formatPrice(total)}*\n\n` +
      `_Olá! Gostaria de confirmar meu pedido!_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5531997584189?text=${encoded}`, '_blank');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 cursor-default"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0A1329] text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 leading-none">Sua Sacola</h2>
              <span className="text-[11px] text-gray-500 font-medium">Caca Store Garanhuns</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-200/70 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Voltar para a loja e continuar escolhendo"
            >
              <span>← Continuar Comprando</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Combo Alert */}
          {comboPairs > 0 ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <p className="font-bold">Combo 2 Pijamas Ativado!</p>
                <p>Você ganhou R$ 20,00 de desconto e Entrega Normal Grátis!</p>
              </div>
            </div>
          ) : eligiblePijamaCount === 1 ? (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Adicione mais <strong>1 pijama</strong> para ativar o <strong>Combo 2 por R$ 190</strong> com frete grátis!
              </span>
            </div>
          ) : null}

          {/* Items */}
          {items.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <ShoppingBag className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm text-gray-500">Sua sacola está vazia.</p>
              <button
                onClick={onClose}
                className="text-xs font-bold text-[#0A1329] underline underline-offset-4 cursor-pointer"
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-gray-100">
              {items.map((item) => (
                <div key={`${item.id}-${item.selectedSize}`} className="pt-3 first:pt-0 flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-20 rounded-xl object-cover bg-gray-50 shrink-0 border border-gray-100"
                  />
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id, item.selectedSize)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded">
                          Tam: {item.selectedSize}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.selectedSize, -1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button
                          disabled={item.quantity >= (item.sizeStock ? (item.sizeStock[item.selectedSize] ?? (item.stock || 1)) : (item.stock || 1))}
                          onClick={() => onUpdateQuantity(item.id, item.selectedSize, 1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title={item.quantity >= (item.sizeStock ? (item.sizeStock[item.selectedSize] ?? (item.stock || 1)) : (item.stock || 1)) ? 'Limite de estoque atingido' : 'Adicionar mais 1'}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <>
              {/* Delivery Choice (3 Opções: Expressa Hoje, Entrega em 24h por R$ 6 e Retirada) */}
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
                <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Como quer receber?
                </span>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {/* Opção 1: Entrega Expressa Hoje */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('expressa')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryMethod === 'expressa'
                        ? 'border-[#0A1329] bg-gray-50 shadow-xs ring-1 ring-[#0A1329]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span className="text-[10px] font-black text-amber-600">
                        {qualifiesForFreeNormalShipping ? 'R$ 4,00' : 'R$ 10,00'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">Expressa</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Hoje / Horas</span>
                  </button>

                  {/* Opção 2: Entrega em 24h (R$ 6,00 ou Grátis) */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('normal')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryMethod === 'normal'
                        ? 'border-[#0A1329] bg-gray-50 shadow-xs ring-1 ring-[#0A1329]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Clock className="w-3.5 h-3.5 text-[#0A1329]" />
                      <span className={`text-[10px] font-black ${qualifiesForFreeNormalShipping ? 'text-[#00B048]' : 'text-gray-900'}`}>
                        {qualifiesForFreeNormalShipping ? 'GRÁTIS' : 'R$ 6,00'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">Em 24h</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Entrega Normal</span>
                  </button>

                  {/* Opção 3: Retirada */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('retirada')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryMethod === 'retirada'
                        ? 'border-[#0A1329] bg-gray-50 shadow-xs ring-1 ring-[#0A1329]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0A1329]" />
                      <span className="text-[10px] font-black text-[#00B048]">GRÁTIS</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 leading-tight">Retirada</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">No local</span>
                  </button>
                </div>
              </div>

              {/* Forma de Pagamento (Pix Imediato ou Link Cartão) */}
              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Forma de Pagamento:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'border-[#0A1329] bg-gray-50 shadow-xs ring-1 ring-[#0A1329]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#00B048]" />
                      <span>Pix Imediato</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Chave enviada no WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_link')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'cartao_link'
                        ? 'border-[#0A1329] bg-gray-50 shadow-xs ring-1 ring-[#0A1329]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-0.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#0A1329]" />
                      <span>Link Cartão</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Parcelamento em até 3x</span>
                  </button>
                </div>
              </div>

              {/* Delivery Data */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Seus Dados para Entrega:
                </span>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#0A1329] rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none"
                />
                {deliveryMethod !== 'retirada' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Bairro em Garanhuns"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="bg-gray-50 border border-gray-200 focus:border-[#0A1329] rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Rua e Número"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-gray-50 border border-gray-200 focus:border-[#0A1329] rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Ponto de referência (opcional)"
                      value={referencePoint}
                      onChange={(e) => setReferencePoint(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-[#0A1329] rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none"
                    />
                  </>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 space-y-3">
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-gray-900 font-semibold">{formatPrice(subtotal)}</span>
              </div>

              {comboDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Desconto Combo 2 Pijamas:</span>
                  <span>-{formatPrice(comboDiscount)}</span>
                </div>
              )}

              {/* Taxa de Entrega Atualizada com o valor selecionado */}
              <div className="flex justify-between">
                <span>
                  {deliveryMethod === 'expressa'
                    ? 'Taxa Entrega Expressa (Hoje):'
                    : deliveryMethod === 'normal'
                    ? 'Taxa Entrega Normal (24h):'
                    : 'Retirada no Local:'}
                </span>
                <span className="text-gray-900 font-semibold">
                  {shippingCost === 0 ? (
                    <span className="text-[#00B048] font-bold">GRÁTIS</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>

              {/* Total a Pagar com a taxa somada */}
              <div className="flex justify-between items-baseline text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total a Pagar:</span>
                <span className="text-xl font-extrabold text-[#0A1329]">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckoutWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5 text-white fill-white" />
              <span>FINALIZAR PEDIDO NO WHATSAPP</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Botão claro para Continuar Comprando */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>← Continuar Escolhendo Mais Peças</span>
            </button>

            <p className="text-[10px] text-center text-gray-400">
              🔒 Seu pedido é enviado formatado para o WhatsApp com total praticidade.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
