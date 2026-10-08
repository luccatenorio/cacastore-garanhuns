export type Category = 'Todos' | 'Pijamas Americanos' | 'Babydolls' | 'Moda Fitness';

export interface Product {
  id: string;
  name: string;
  category: Category | string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  sizes: string[];
  sizeStock?: Record<string, number>;
  stock: number;
  image: string;
  images: string[];
  description: string;
  fabric: string;
  badge?: string;
  isComboEligible?: boolean;
  createdAt?: string;
}

export interface CartItem extends Product {
  selectedSize: string;
  quantity: number;
}

export type DeliveryMethod = 'expressa' | 'normal' | 'retirada';
export type PaymentMethod = 'pix' | 'cartao_link';

export interface CheckoutData {
  customerName: string;
  phone: string;
  neighborhood: string;
  address: string;
  referencePoint: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface Combo {
  id: string;
  name: string;
  description?: string;
  product1Id?: string;
  product1Name: string;
  product1Image: string;
  product2Id?: string;
  product2Name: string;
  product2Image: string;
  originalPrice: number;
  comboPrice: number;
  badge?: string;
  isActive?: boolean;
}

export interface SaleRecord {
  id: string;
  productId?: string;
  productName: string;
  productImage?: string;
  category?: string;
  size: string;
  quantity: number;
  price: number;
  costPrice: number;
  profit: number;
  paymentMethod: string;
  notes?: string;
  saleDate: string; // YYYY-MM-DD
  createdAt: string;
}

