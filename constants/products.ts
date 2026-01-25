
export interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    rating: number;
    image: any;
    images?: any[]; // Array of images for carousel
    category: string;
    subCategory: string;
    description: string;
    discount: number;
    subtitle?: string; // e.g. "Premium Cotton"
    colors?: string[]; // hex codes
    sizes?: string[]; // e.g. ["S", "M", "L"]
    details?: string; // Long description
    isLightningFast?: boolean;
}

export const PRODUCTS: Product[] = [
    // Accessories - Bags & Backpacks
    {
        id: '1',
        name: 'Vibrant Summer Collection: Floral Midi Dress',
        price: 1299,
        originalPrice: 2599,
        rating: 4.8,
        image: require('../assets/images/handbags.jpg'), // Using existing as placeholder, ideally needs actual dress image
        images: [
            require('../assets/images/handbags.jpg'),
            require('../assets/images/handbags.jpg'), // Duplicates for carousel demo
            require('../assets/images/handbags.jpg')
        ],
        category: 'Accessories', // Temporarily keeping as Accessories to match existing flows, but name implies Fashion
        subCategory: 'Handbags', // Kept for consistency with previous steps
        subtitle: 'Premium Cotton • Sustainable Fashion',
        description: 'Elevate your summer wardrobe with this premium midi dress.',
        details: 'Elevate your summer wardrobe with this premium midi dress. Crafted from 100% breathable cotton, it features a flattering A-line silhouette and vibrant floral prints that are perfect for both casual outings and brunch dates.',
        discount: 50,
        colors: ['#FBBF24', '#3B82F6', '#F472B6', '#1F2937'], // Yellow, Blue, Pink, Dark
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        isLightningFast: true
    },
    {
        id: '2',
        name: 'School Backpack',
        price: 899,
        originalPrice: 1499,
        rating: 4.2,
        image: require('../assets/images/backpacks.jpg'),
        category: 'Accessories',
        subCategory: 'Backpacks',
        description: 'Durable and spacious school backpack with multiple compartments.',
        discount: 40
    },
    {
        id: '3',
        name: 'Slim Laptop Bag',
        price: 1599,
        originalPrice: 2999,
        rating: 4.6,
        image: require('../assets/images/laptopbags.jpg'),
        category: 'Accessories',
        subCategory: 'Laptop Bags',
        description: 'Water-resistant laptop bag fitting up to 15-inch laptops.',
        discount: 46
    },
    // Accessories - Wallets
    {
        id: '4',
        name: 'Leather Bi-fold Wallet',
        price: 499,
        originalPrice: 999,
        rating: 4.3,
        image: require('../assets/images/wallets.jpg'),
        category: 'Accessories',
        subCategory: 'Wallets',
        description: 'Genuine leather wallet with card slots and coin pocket.',
        discount: 50
    },
    // Watches
    {
        id: '5',
        name: 'Classic Analog Watch',
        price: 1999,
        originalPrice: 3999,
        rating: 4.7,
        image: require('../assets/images/analog.jpg'),
        category: 'Accessories',
        subCategory: 'Analog',
        description: 'Elegant analog watch with a stainless steel strap.',
        discount: 50
    },
    {
        id: '6',
        name: 'Smart Fitness Watch',
        price: 2499,
        originalPrice: 4999,
        rating: 4.4,
        image: require('../assets/images/smartwatches.jpg'),
        category: 'Accessories',
        subCategory: 'Smart Watches',
        description: 'Track your fitness goals with this feature-rich smart watch.',
        discount: 50
    },

    // Beauty - Skincare
    {
        id: '7',
        name: 'Hydrating Face Wash',
        price: 299,
        originalPrice: 499,
        rating: 4.5,
        image: require('../assets/images/facewash.jpg'),
        category: 'Beauty',
        subCategory: 'Face Wash & Cleanser',
        description: 'Gentle face wash for all skin types, paraben-free.',
        discount: 40
    },
    {
        id: '8',
        name: 'Daily Moisturizer',
        price: 399,
        originalPrice: 599,
        rating: 4.6,
        image: require('../assets/images/moisturizers.jpg'),
        category: 'Beauty',
        subCategory: 'Moisturizers & Creams',
        description: 'Lightweight moisturizer for soft and glowing skin.',
        discount: 33
    },

    // Beauty - Makeup
    {
        id: '9',
        name: 'Matte Lipstick',
        price: 450,
        originalPrice: 900,
        rating: 4.8,
        image: require('../assets/images/lipmakeup.jpg'),
        category: 'Beauty',
        subCategory: 'Lip Makeup',
        description: 'Long-lasting matte lipstick in vibrant shades.',
        discount: 50
    },
    {
        id: '10',
        name: 'Eye Shadow Palette',
        price: 850,
        originalPrice: 1200,
        rating: 4.3,
        image: require('../assets/images/eyemakeup.jpg'),
        category: 'Beauty',
        subCategory: 'Eye Makeup',
        description: 'Highly pigmented eye shadow palette with 12 colors.',
        discount: 29
    },

    // Home - Kitchenware
    {
        id: '11',
        name: 'Non-Stick Cookware Set',
        price: 2499,
        originalPrice: 4999,
        rating: 4.6,
        image: null, // Placeholder if no specific image
        category: 'Home & Living',
        subCategory: 'Cookware',
        description: '3-piece non-stick cookware set including fry pan and kadhai.',
        discount: 50
    },

    // Gadgets
    {
        id: '12',
        name: 'Wireless Earbuds',
        price: 1299,
        originalPrice: 2999,
        rating: 4.4,
        image: null,
        category: 'Gadgets',
        subCategory: 'Earphones',
        description: 'True wireless earbuds with noise cancellation.',
        discount: 56
    },
    {
        id: '13',
        name: 'Fast Charging Cable',
        price: 199,
        originalPrice: 499,
        rating: 4.2,
        image: null,
        category: 'Gadgets',
        subCategory: 'Cables',
        description: 'Durable braided fast charging cable for Type-C devices.',
        discount: 60
    }
];
