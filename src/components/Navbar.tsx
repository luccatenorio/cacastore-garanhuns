import React, { useState } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (category: string) => void;
  onScrollToSection: (id: string) => void;
  onOpenPromo190?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onScrollToSection,
  onOpenPromo190,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0A1329] border-b border-[#16264C] shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 md:h-28 flex items-center justify-between gap-4">
        
        {/* Left: Real Official Logo - Much Larger & Prominent */}
        <div 
          className="flex items-center cursor-pointer group py-1.5"
          onClick={() => {
            onSelectCategory('Todos');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <img
            src="/logo-header.png"
            alt="Caca Store Pijamas e Moda Fit"
            className="h-12 sm:h-14 md:h-16 w-auto object-contain group-hover:scale-103 transition-transform drop-shadow-sm"
          />
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-gray-200">
          <button
            onClick={() => {
              onSelectCategory('Todos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Início
          </button>
          
          <button
            onClick={() => onScrollToSection('mais-vendidos')}
            className="text-[#D4AF37] hover:text-[#F6E6B4] transition-colors cursor-pointer font-extrabold"
          >
            Mais Vendidos
          </button>

          <button
            onClick={() => onSelectCategory('Pijamas Americanos')}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Pijamas Americanos
          </button>

          <button
            onClick={() => onSelectCategory('Bermudolls')}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Bermudolls
          </button>

          <button
            onClick={() => onSelectCategory('Babydolls')}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Babydolls
          </button>

          <button
            onClick={() => onSelectCategory('Moda Fitness')}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Moda Fitness
          </button>

          <button
            onClick={() => {
              if (onOpenPromo190) {
                onOpenPromo190();
              } else {
                onScrollToSection('combo-promocao');
              }
            }}
            className="text-[#F6E6B4] hover:text-[#D4AF37] transition-colors cursor-pointer font-extrabold flex items-center gap-1"
          >
            <span>Combo Especial</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 sm:p-2.5 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Buscar produto"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* WhatsApp Direct Button - Mobile & Desktop with Official Icon and Radar Effect */}
          {/* Mobile version (compact circle with radar effect) */}
          <a
            href="https://wa.me/5531997584189?text=Ol%C3%A1!%20Gostaria%20de%20um%20atendimento%20pelo%20WhatsApp%20da%20Caca%20Store"
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden relative p-1.5 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-white transition-all flex items-center justify-center active:scale-95 group"
            title="Atendimento no WhatsApp"
            aria-label="Falar no WhatsApp"
          >
            <span className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-35" />
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shadow-md relative z-10 group-hover:rotate-6 transition-transform">
              <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5 text-white fill-white" />
            </div>
            <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-[#0A1329] z-20" />
          </a>

          {/* Desktop & Tablet version (clean pill with real icon, radar ping and Online status) */}
          <a
            href="https://wa.me/5531997584189?text=Ol%C3%A1!%20Gostaria%20de%20um%20atendimento%20pelo%20WhatsApp%20da%20Caca%20Store"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2.5 bg-white/5 hover:bg-[#25D366]/15 border border-[#25D366]/40 hover:border-[#25D366] text-white pl-2 pr-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-102 hover:shadow-[0_6px_22px_rgba(37,211,102,0.3)] group cursor-pointer"
            title="Atendimento no WhatsApp"
          >
            {/* Ícone Oficial WhatsApp com Radar Ping */}
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute w-full h-full bg-[#25D366] rounded-full animate-ping opacity-40" />
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#25D366] flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform relative z-10">
                <WhatsAppIcon variant="symbol" className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white fill-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0A1329] z-20" />
            </div>

            <div className="text-left leading-tight pr-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#25D366] font-extrabold uppercase tracking-wider">WhatsApp</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden md:inline-block" />
              </div>
              <span className="font-bold text-white text-[11px] sm:text-xs group-hover:text-[#25D366] transition-colors mt-0.5 block">
                Online Agora
              </span>
            </div>
          </a>

          {/* Cart Bag Icon with Badge */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 sm:p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer border border-white/10"
            aria-label="Abrir sacola de compras"
          >
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#0A1329] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-[#0A1329] shadow-sm animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Expandable Search Input */}
      {showSearch && (
        <div className="bg-[#060B18] border-t border-[#16264C] px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-xl mx-auto relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="O que você procura? Ex: pijama americano, canelado..."
              className="w-full bg-[#0A1329] border border-[#16264C] focus:border-[#D4AF37] rounded-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-400 focus:outline-none"
              autoFocus
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
