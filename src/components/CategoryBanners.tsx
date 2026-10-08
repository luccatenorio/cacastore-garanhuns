import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CategoryBannersProps {
  onSelectCategory: (category: string) => void;
}

export const CategoryBanners: React.FC<CategoryBannersProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      title: 'Pijamas Americanos',
      subtitle: 'Clássicos com botões frontais',
      category: 'Pijamas Americanos',
      image: '/produtos_catalogo/americano_coracao_full.png',
      objectPosition: 'object-[center_8%]',
    },
    {
      title: 'Bermudolls',
      subtitle: 'Conforto & caimento no joelho',
      category: 'Bermudolls',
      image: '/produtos_catalogo/BERMUDOLL AZUL.jpeg',
      objectPosition: 'object-[center_10%]',
    },
    {
      title: 'Babydolls & Alcinhas',
      subtitle: 'Frescor, maciez & toque leve',
      category: 'Babydolls',
      image: '/conjunto-virginia-limpo.png',
      objectPosition: 'object-top',
    },
    {
      title: 'Moda Fitness',
      subtitle: 'Conjuntos de alta sustentação',
      category: 'Moda Fitness',
      image: '/cat-moda-fitness.jpg',
      objectPosition: 'object-center',
    },
    {
      title: 'Pijamas Masculinos',
      subtitle: 'Modelagens clássicas e elegantes',
      category: 'Masculino',
      image: '/produtos_catalogo/PIJAMA BEGE MASCULINO.jpeg',
      objectPosition: 'object-top',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Nossas Coleções
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Navegue pelas categorias e escolha suas peças favoritas para entrega hoje em Garanhuns
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
        {categories.map((cat) => (
          <div
            key={cat.title}
            onClick={() => onSelectCategory(cat.category)}
            className="group relative h-80 sm:h-96 md:h-[410px] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <img
              src={cat.image}
              alt={cat.title}
              className={`w-full h-full object-cover ${cat.objectPosition} group-hover:scale-105 transition-transform duration-500`}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1329]/95 via-[#0A1329]/25 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] mb-1">
                Coleção 2026
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold leading-tight">
                {cat.title}
              </h3>
              <p className="text-xs text-gray-200 mt-0.5 opacity-90 line-clamp-2">
                {cat.subtitle}
              </p>
              
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] group-hover:translate-x-1 transition-transform">
                <span>Ver Modelos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
