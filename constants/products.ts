
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
    },
    // Electronics - Headphones & Audio
    {
        id: '14',
        name: 'Noise Cancelling Headphones',
        price: 3499,
        originalPrice: 6999,
        rating: 4.7,
        image: require('../assets/images/backpacks.jpg'), // Using available asset as placeholder for tech/lifestyle
        category: 'Electronics',
        subCategory: 'Audio',
        description: 'Immersive sound with active noise cancellation.',
        discount: 50
    },
    {
        id: '15',
        name: 'Portable Bluetooth Speaker',
        price: 1299,
        originalPrice: 2499,
        rating: 4.5,
        image: require('../assets/images/smartwatches.jpg'), // Placeholder
        category: 'Electronics',
        subCategory: 'Audio',
        description: 'Compact speaker with powerful bass and long battery life.',
        discount: 48
    },

    // Fashion - Women's Accessories
    {
        id: '16',
        name: 'Gold Plated Bangles',
        price: 599,
        originalPrice: 1199,
        rating: 4.4,
        image: require('../assets/images/bangles.jpg'),
        category: 'Fashion',
        subCategory: 'Jewellery',
        description: 'Traditional gold plated bangles set of 4.',
        discount: 50
    },
    {
        id: '17',
        name: 'Bridal Necklace Set',
        price: 1499,
        originalPrice: 2999,
        rating: 4.8,
        image: require('../assets/images/bridalaccessories.jpg'),
        category: 'Fashion',
        subCategory: 'Jewellery',
        description: 'Exquisite bridal necklace set with matching earrings.',
        discount: 50
    },
    {
        id: '18',
        name: 'Statement Earrings',
        price: 299,
        originalPrice: 599,
        rating: 4.3,
        image: require('../assets/images/earrings.jpg'),
        category: 'Fashion',
        subCategory: 'Jewellery',
        description: 'Trendy statement earrings for party wear.',
        discount: 50
    },
    {
        id: '19',
        name: 'Crystal Rings Set',
        price: 199,
        originalPrice: 399,
        rating: 4.2,
        image: require('../assets/images/rings.jpg'),
        category: 'Fashion',
        subCategory: 'Jewellery',
        description: 'Set of 5 adjustable crystal rings.',
        discount: 50
    },
    {
        id: '20',
        name: 'Pearl Necklace',
        price: 399,
        originalPrice: 799,
        rating: 4.5,
        image: require('../assets/images/necklaces.jpg'),
        category: 'Fashion',
        subCategory: 'Jewellery',
        description: 'Elegant single strand pearl necklace.',
        discount: 50
    },

    // Fashion - Accessories
    {
        id: '21',
        name: 'Classic Leather Belt',
        price: 499,
        originalPrice: 999,
        rating: 4.4,
        image: require('../assets/images/belts.jpg'),
        category: 'Fashion',
        subCategory: 'Accessories',
        description: 'Genuine leather belt with sleek buckle.',
        discount: 50
    },
    {
        id: '22',
        name: 'Stylish Sling Bag',
        price: 699,
        originalPrice: 1399,
        rating: 4.6,
        image: require('../assets/images/slingbags.jpg'),
        category: 'Fashion',
        subCategory: 'Bags',
        description: 'Compact sling bag for everyday essentials.',
        discount: 50
    },
    {
        id: '23',
        name: 'Travel Duffel Bag',
        price: 1599,
        originalPrice: 3199,
        rating: 4.7,
        image: require('../assets/images/travelbags.jpg'),
        category: 'Fashion',
        subCategory: 'Bags',
        description: 'Spacious duffel bag perfect for weekend getaways.',
        discount: 50
    },
    {
        id: '24',
        name: 'Card Holder',
        price: 199,
        originalPrice: 399,
        rating: 4.3,
        image: require('../assets/images/cardholders.jpg'),
        category: 'Fashion',
        subCategory: 'Accessories',
        description: 'Slim card holder made of premium faux leather.',
        discount: 50
    },
    {
        id: '25',
        name: 'Printed Scarf',
        price: 299,
        originalPrice: 599,
        rating: 4.5,
        image: require('../assets/images/scarves.jpg'),
        category: 'Fashion',
        subCategory: 'Accessories',
        description: 'Soft cotton scarf with floral prints.',
        discount: 50
    },

    // Beauty - Hair Care
    {
        id: '26',
        name: 'Nourishing Hair Oil',
        price: 249,
        originalPrice: 499,
        rating: 4.6,
        image: require('../assets/images/hairoil.jpg'),
        category: 'Beauty',
        subCategory: 'Hair Care',
        description: 'Ayurvedic hair oil for hair fall control.',
        discount: 50
    },
    {
        id: '27',
        name: 'Volumizing Shampoo',
        price: 349,
        originalPrice: 699,
        rating: 4.4,
        image: require('../assets/images/shampoo.jpg'),
        category: 'Beauty',
        subCategory: 'Hair Care',
        description: 'Sulphate-free shampoo for extra volume.',
        discount: 50
    },
    {
        id: '28',
        name: 'Hair Serum',
        price: 299,
        originalPrice: 599,
        rating: 4.5,
        image: require('../assets/images/serums.jpg'),
        category: 'Beauty',
        subCategory: 'Hair Care',
        description: 'Anti-frizz hair serum for smooth shine.',
        discount: 50
    },
    {
        id: '29',
        name: 'Hair Dryer',
        price: 1299,
        originalPrice: 2599,
        rating: 4.7,
        image: require('../assets/images/hairdryers.jpg'),
        category: 'Beauty',
        subCategory: 'Appliances',
        description: '1200W hair dryer with cold air setting.',
        discount: 50
    },

    // Grooming
    {
        id: '30',
        name: 'Beard Trimmer',
        price: 999,
        originalPrice: 1999,
        rating: 4.5,
        image: require('../assets/images/trimmers.jpg'),
        category: 'Grooming',
        subCategory: 'Appliances',
        description: 'Rechargeable beard trimmer with adjustable settings.',
        discount: 50
    },
    {
        id: '31',
        name: 'Shaving Kit',
        price: 799,
        originalPrice: 1599,
        rating: 4.4,
        image: require('../assets/images/shaving.jpg'),
        category: 'Grooming',
        subCategory: 'Essentials',
        description: 'Complete shaving kit with razor, foam and brush.',
        discount: 50
    },
    {
        id: '32',
        name: 'Men\'s Perfume',
        price: 599,
        originalPrice: 1199,
        rating: 4.3,
        image: require('../assets/images/perfumes.jpg'),
        category: 'Grooming',
        subCategory: 'Fragrance',
        description: 'Long-lasting woody fragrance for men.',
        discount: 50
    },
    {
        id: '33',
        name: 'Deodorant Spray',
        price: 199,
        originalPrice: 399,
        rating: 4.2,
        image: require('../assets/images/deodorants.jpg'),
        category: 'Grooming',
        subCategory: 'Fragrance',
        description: 'Fresh citrus scent deodorant for daily use.',
        discount: 50
    },

    // Eyewear
    {
        id: '34',
        name: 'Aviator Sunglasses',
        price: 899,
        originalPrice: 1799,
        rating: 4.6,
        image: require('../assets/images/sunglasses.jpg'),
        category: 'Fashion',
        subCategory: 'Eyewear',
        description: 'Classic aviator sunglasses with UV protection.',
        discount: 50
    },
    {
        id: '35',
        name: 'Blue Light Glasses',
        price: 599,
        originalPrice: 1199,
        rating: 4.4,
        image: require('../assets/images/bluelightglasses.jpg'),
        category: 'Fashion',
        subCategory: 'Eyewear',
        description: 'Anti-glare computer glasses for eye strain relief.',
        discount: 50
    },
    {
        id: '36',
        name: 'Reading Glasses',
        price: 399,
        originalPrice: 799,
        rating: 4.3,
        image: require('../assets/images/readingglasses.jpg'),
        category: 'Fashion',
        subCategory: 'Eyewear',
        description: 'Lightweight reading glasses (+1.5 power).',
        discount: 50
    }
];
