import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface HeroCarouselProps {
  onScrollToSection: (id: string) => void;
  onOpenPromo190?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onScrollToSection, onOpenPromo190 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      tag: 'OFERTA DE LANÇAMENTO • GARANHUNS',
      title: 'Combo 2 Pijamas por R$ 190 com Frete Grátis',
      subtitle: 'Leve qualquer 2 modelos de pijamas ou babydolls e a entrega sai por nossa conta na sua porta!',
      cta: 'Aproveitar Combo',
      target: 'combo-promocao',
      image: '/banner-combo-pijamas.jpg',
    },
    {
      id: 2,
      tag: 'NOVA COLEÇÃO 2026',
      title: 'Vista-se com os pijamas mais confortáveis',
      subtitle: 'Tecido 100% algodão puro e acabamento impecável. Peça hoje e receba com entrega expressa em Garanhuns!',
      cta: 'Ver Mais Vendidos',
      target: 'mais-vendidos',
      image: '/banner-babydoll-luxury.jpg',
    },
  ];

  // Auto-play every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <section className="relative w-full overflow-hidden bg-gray-950 h-[380px] sm:h-[450px] md:h-[500px]">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {/* Background Image */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover object-center"
          />

          {/* Deep Navy/Black Gradient for Maximum Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#060B18]/90 via-[#0A1329]/65 to-black/30" />

          {/* Text Content */}
          <div className="absolute inset-0 max-w-7xl mx-auto px-5 sm:px-12 flex flex-col justify-center items-start text-white">
            <div className="max-w-xl space-y-3 sm:space-y-4">
              <span className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-widest bg-[#D4AF37] text-[#0A1329] px-3 py-1 rounded-full shadow-md">
                {slide.tag}
              </span>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
                {slide.title}
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-gray-200 line-clamp-2 max-w-md drop-shadow-xs font-medium">
                {slide.subtitle}
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (slide.id === 1 && onOpenPromo190) {
                      onOpenPromo190();
                    } else {
                      onScrollToSection(slide.target);
                    }
                  }}
                  className="bg-[#D4AF37] hover:bg-[#F6E6B4] text-[#0A1329] font-black text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>{slide.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Prev / Next Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer"
        aria-label="Próximo slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`transition-all rounded-full cursor-pointer ${
              index === currentSlide
                ? 'w-7 h-2 bg-[#D4AF37]'
                : 'w-2 h-2 bg-white/50 hover:bg-white'
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
