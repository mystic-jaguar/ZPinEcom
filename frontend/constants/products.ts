// Import ProductObject from centralized types
import { ProductObject } from '../types/types';

// Export ProductObject as the main Product type
export type Product = ProductObject;

// Helper function to create mock product with required fields
const createMockProduct = (data: Partial<ProductObject> & {
    id: string;
    name: string;
    price: number;
    image: any;
    category: string;
    subCategory: string;
    description: string;
}): ProductObject => {
    return {
        productId: data.id,
        userId: 'seller-123',
        productName: data.name,
        description: data.description,
        categoryId: `cat-${data.category.toLowerCase()}`,
        deepestCategoryName: data.subCategory,
        categoryPath: `${data.category.toLowerCase()}-${data.subCategory.toLowerCase().replace(/\s+/g, '-')}`,
        price: data.price,
        quantity: 100,
        inStock: true,
        images: Array.isArray(data.image)
            ? data.image.map(img => (typeof img === 'string' || typeof img === 'number') ? img : (img.uri || 'https://via.placeholder.com/400'))
            : [(typeof data.image === 'number' || typeof data.image === 'string') ? data.image : (data.image?.uri || 'https://via.placeholder.com/400')],
        sellerLocation: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            coordinates: {
                type: 'Point',
                coordinates: [72.8777, 19.0760]
            }
        },
        distance: undefined,
        timeStamp: new Date().toISOString(),
        originalPrice: data.originalPrice,
        rating: data.rating || 4.5,
        discount: data.discount || 0,
        subtitle: data.subtitle,
        colors: data.colors,
        sizes: data.sizes,
        details: data.details || data.description,
        isLightningFast: data.isLightningFast
    };
};

export const PRODUCTS: Product[] = [
    // --- FASHION: MEN ---
    createMockProduct({
        id: '101',
        name: 'Classic White Round Neck',
        price: 499,
        originalPrice: 999,
        rating: 4.5,
        image: { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Round Neck',
        description: 'Essential white round neck t-shirt made from 100% cotton.',
        discount: 50,
        sizes: ['S', 'M', 'L', 'XL']
    }),
    createMockProduct({
        id: '102',
        name: 'Black Polo T-Shirt',
        price: 799,
        originalPrice: 1599,
        rating: 4.6,
        image: { uri: 'https://images.unsplash.com/photo-1626557981101-aae6f84aa6ff?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Polo',
        description: 'Classic fit polo t-shirt with ribbed collar.',
        discount: 50,
        sizes: ['M', 'L', 'XL']
    }),
    createMockProduct({
        id: '103',
        name: 'Navy Blue Sweatshirt',
        price: 1299,
        originalPrice: 2599,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Sweatshirt',
        description: 'Comfortable navy sweatshirt with fleece lining.',
        discount: 50,
        sizes: ['M', 'L', 'XL']
    }),
    createMockProduct({
        id: '104',
        name: 'Premium Grey Hoodie',
        price: 1499,
        originalPrice: 2999,
        rating: 4.8,
        image: { uri: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Hoodie',
        description: 'Soft grey hoodie with adjustable drawstring.',
        discount: 50,
        sizes: ['S', 'M', 'L', 'XL']
    }),
    createMockProduct({
        id: '105',
        name: 'Slim Fit Denim Jeans',
        price: 1999,
        originalPrice: 3999,
        rating: 4.6,
        image: { uri: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Jeans',
        description: 'Classic blue denim with slim fit cut.',
        discount: 50,
        sizes: ['30', '32', '34', '36']
    }),

    // --- ACCESSORIES ---
    createMockProduct({
        id: '2',
        name: 'School Backpack',
        price: 899,
        originalPrice: 1499,
        rating: 4.4,
        image: require('../assets/images/backpacks.jpg'),
        category: 'Accessories',
        subCategory: 'Backpacks',
        description: 'Durable school backpack with multiple compartments.',
        discount: 40
    }),
    createMockProduct({
        id: '201',
        name: 'Leather Wallet',
        price: 699,
        originalPrice: 1299,
        rating: 4.5,
        image: require('../assets/images/wallets.jpg'),
        category: 'Accessories',
        subCategory: 'Wallets',
        description: 'Premium leather wallet with card slots.',
        discount: 46
    }),
    createMockProduct({
        id: '202',
        name: 'Aviator Sunglasses',
        price: 1299,
        originalPrice: 2599,
        rating: 4.6,
        image: require('../assets/images/sunglasses.jpg'),
        category: 'Accessories',
        subCategory: 'Sunglasses',
        description: 'Classic aviator sunglasses with UV protection.',
        discount: 50
    }),
    createMockProduct({
        id: '203',
        name: 'Analog Wristwatch',
        price: 2499,
        originalPrice: 4999,
        rating: 4.7,
        image: require('../assets/images/smartwatches.jpg'),
        category: 'Accessories',
        subCategory: 'Watches',
        description: 'Elegant analog watch with leather strap.',
        discount: 50
    }),
    createMockProduct({
        id: '204',
        name: 'Leather Belt',
        price: 599,
        originalPrice: 1199,
        rating: 4.4,
        image: require('../assets/images/belts.jpg'),
        category: 'Accessories',
        subCategory: 'Belts',
        description: 'Genuine leather belt with metal buckle.',
        discount: 50
    }),
    createMockProduct({
        id: '205',
        name: 'Cotton Scarf',
        price: 399,
        originalPrice: 799,
        rating: 4.3,
        image: require('../assets/images/scarves.jpg'),
        category: 'Accessories',
        subCategory: 'Scarves',
        description: 'Soft cotton scarf in various colors.',
        discount: 50
    }),
    createMockProduct({
        id: '206',
        name: 'Leather Gloves',
        price: 799,
        originalPrice: 1599,
        rating: 4.5,
        image: { uri: 'https://images.unsplash.com/photo-1584210689716-c94788f41bc2?auto=format&fit=crop&q=80&w=800' },
        category: 'Accessories',
        subCategory: 'Gloves',
        description: 'Warm leather gloves for winter.',
        discount: 50
    }),
    createMockProduct({
        id: '207',
        name: 'Baseball Cap',
        price: 499,
        originalPrice: 999,
        rating: 4.4,
        image: require('../assets/images/caps.jpg'),
        category: 'Accessories',
        subCategory: 'Caps',
        description: 'Adjustable baseball cap with embroidered logo.',
        discount: 50
    }),
    createMockProduct({
        id: '208',
        name: 'Silk Tie',
        price: 599,
        originalPrice: 1199,
        rating: 4.6,
        image: { uri: 'https://images.unsplash.com/photo-1599663253687-fdceaa1eee48?auto=format&fit=crop&q=80&w=800' },
        category: 'Accessories',
        subCategory: 'Ties',
        description: 'Premium silk tie for formal occasions.',
        discount: 50
    }),
    createMockProduct({
        id: '209',
        name: 'Leather Messenger Bag',
        price: 2499,
        originalPrice: 4999,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800' },
        category: 'Accessories',
        subCategory: 'Bags',
        description: 'Stylish messenger bag with laptop compartment.',
        discount: 50
    }),

    // --- HOME & BEAUTY ---
    createMockProduct({
        id: '7',
        name: 'Hydrating Face Wash',
        price: 299,
        originalPrice: 499,
        rating: 4.5,
        image: require('../assets/images/facewash.jpg'),
        category: 'Beauty',
        subCategory: 'Face Wash',
        description: 'Gentle hydrating face wash for daily use.',
        discount: 40
    }),
    createMockProduct({
        id: '301',
        name: 'Anti-Aging Serum',
        price: 1499,
        originalPrice: 2999,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800' },
        category: 'Beauty',
        subCategory: 'Serums',
        description: 'Advanced anti-aging serum with vitamin C.',
        discount: 50
    }),
    createMockProduct({
        id: '302',
        name: 'Moisturizing Cream',
        price: 699,
        originalPrice: 1399,
        rating: 4.6,
        image: require('../assets/images/moisturizers.jpg'),
        category: 'Beauty',
        subCategory: 'Moisturizers',
        description: 'Rich moisturizing cream for all skin types.',
        discount: 50
    }),
    createMockProduct({
        id: '303',
        name: 'Sunscreen SPF 50',
        price: 599,
        originalPrice: 1199,
        rating: 4.5,
        image: { uri: 'https://images.unsplash.com/photo-1556228994-a37afe7ff2e8?auto=format&fit=crop&q=80&w=800' },
        category: 'Beauty',
        subCategory: 'Sunscreen',
        description: 'Broad spectrum sunscreen with SPF 50.',
        discount: 50
    }),
    createMockProduct({
        id: '401',
        name: 'Scented Candle Set',
        price: 899,
        originalPrice: 1799,
        rating: 4.6,
        image: { uri: 'https://images.unsplash.com/photo-1602874801006-95415c67b6a6?auto=format&fit=crop&q=80&w=800' },
        category: 'Home',
        subCategory: 'Candles',
        description: 'Set of 3 aromatic scented candles.',
        discount: 50
    }),
    createMockProduct({
        id: '402',
        name: 'Cotton Bed Sheets',
        price: 1999,
        originalPrice: 3999,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800' },
        category: 'Home',
        subCategory: 'Bedding',
        description: 'Soft cotton bed sheet set with pillowcases.',
        discount: 50
    }),
];
