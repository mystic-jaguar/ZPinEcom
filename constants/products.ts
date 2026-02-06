
export interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    rating: number;
    image: any;
    images?: any[]; // Array of images for carousel
    category: string; // Top Level (Fashion, Accessories, etc.)
    subCategory: string; // Leaf Level (Round Neck, Backpacks, etc.)
    description: string;
    discount: number;
    subtitle?: string; // e.g. "Premium Cotton"
    colors?: string[]; // hex codes
    sizes?: string[]; // e.g. ["S", "M", "L"]
    details?: string; // Long description
    isLightningFast?: boolean;
}

export const PRODUCTS: Product[] = [
    // --- FASHION: MEN ---
    {
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
    },
    {
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
    },
    {
        id: '103',
        name: 'Oversized Graphic Tee',
        price: 899,
        originalPrice: 1299,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Oversized',
        description: 'Streetwear style oversized t-shirt with cool graphic print.',
        discount: 30,
        sizes: ['S', 'M', 'L']
    },
    {
        id: '104',
        name: 'Slim Fit Blue Jeans',
        price: 1299,
        originalPrice: 2599,
        rating: 4.4,
        image: { uri: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Slim Fit', // Jeans -> Slim Fit
        description: 'Stretchable slim fit denim jeans.',
        discount: 50,
        sizes: ['30', '32', '34', '36']
    },
    {
        id: '105',
        name: 'Casual Checkered Shirt',
        price: 999,
        originalPrice: 1999,
        rating: 4.3,
        image: { uri: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Checkered',
        description: 'Stylish checkered shirt for casual outings.',
        discount: 50,
        sizes: ['M', 'L', 'XL']
    },

    // --- FASHION: WOMEN ---
    {
        id: '201',
        name: 'Floral Summer Dress',
        price: 1499,
        originalPrice: 2999,
        rating: 4.8,
        image: { uri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Dresses',
        description: 'Breezy floral dress perfect for summer days.',
        discount: 50,
        sizes: ['XS', 'S', 'M', 'L']
    },
    {
        id: '202',
        name: 'Classic Blue Denim Jeans',
        price: 1199,
        originalPrice: 2399,
        rating: 4.5,
        image: { uri: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Jeans & Bottoms',
        description: 'High-waist classic blue denim.',
        discount: 50,
        sizes: ['26', '28', '30', '32']
    },
    {
        id: '203',
        name: 'Elegant Kurta Set',
        price: 1899,
        originalPrice: 3799,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&q=80&w=800' },
        category: 'Fashion',
        subCategory: 'Kurta Sets',
        description: 'Embroidered kurta set with dupatta.',
        discount: 50,
        sizes: ['S', 'M', 'L', 'XL']
    },

    // --- ACCESSORIES (Using Filtered Assets) ---
    {
        id: '301',
        name: 'Leather Handbag',
        price: 1599,
        originalPrice: 3199,
        rating: 4.6,
        image: require('../assets/images/handbags.jpg'),
        category: 'Accessories',
        subCategory: 'Handbags',
        description: 'Premium leather handbag with spacious compartments.',
        discount: 50
    },
    {
        id: '302',
        name: 'Travel Backpack',
        price: 1299,
        originalPrice: 2599,
        rating: 4.5,
        image: require('../assets/images/backpacks.jpg'),
        category: 'Accessories',
        subCategory: 'Backpacks',
        description: 'Durable backpack with laptop sleeve.',
        discount: 50
    },
    {
        id: '303',
        name: 'Classic Analog Watch',
        price: 1999,
        originalPrice: 3999,
        rating: 4.7,
        image: require('../assets/images/analog.jpg'),
        category: 'Accessories',
        subCategory: 'Analog',
        description: 'Timeless analog watch for everyday elegance.',
        discount: 50
    },
    {
        id: '304',
        name: 'Digital Sports Watch',
        price: 899,
        originalPrice: 1499,
        rating: 4.3,
        image: require('../assets/images/digital.jpg'),
        category: 'Accessories',
        subCategory: 'Digital',
        description: 'Rugged digital watch with water resistance.',
        discount: 40
    },
    {
        id: '305',
        name: 'Smart Watch Series 5',
        price: 2499,
        originalPrice: 4999,
        rating: 4.6,
        image: require('../assets/images/smartwatches.jpg'),
        category: 'Accessories', // Or Gadgets > Smart Devices > Smart Watches. Kept flexible.
        subCategory: 'Smart Watches',
        description: 'Track fitness, calls and more.',
        discount: 50
    },
    {
        id: '306',
        name: 'Aviator Sunglasses',
        price: 999,
        originalPrice: 1999,
        rating: 4.4,
        image: require('../assets/images/sunglasses.jpg'),
        category: 'Accessories',
        subCategory: 'Sunglasses',
        description: 'Classic aviator style with UV protection.',
        discount: 50
    },
    {
        id: '307',
        name: 'Anti-Glare Glasses',
        price: 699,
        originalPrice: 1299,
        rating: 4.2,
        image: require('../assets/images/bluelightglasses.jpg'),
        category: 'Accessories',
        subCategory: 'Blue Light Glasses',
        description: 'Protect your eyes from digital strain.',
        discount: 46
    },
    {
        id: '308',
        name: 'Gold Plated Bangles',
        price: 499,
        originalPrice: 999,
        rating: 4.5,
        image: require('../assets/images/bangles.jpg'),
        category: 'Accessories',
        subCategory: 'Bangles & Bracelets',
        description: 'Traditional gold plated bangles.',
        discount: 50
    },
    {
        id: '309',
        name: 'Crystal Earrings',
        price: 299,
        originalPrice: 599,
        rating: 4.3,
        image: require('../assets/images/earrings.jpg'),
        category: 'Accessories',
        subCategory: 'Earrings',
        description: 'Elegant crystal stud earrings.',
        discount: 50
    },
    {
        id: '310',
        name: 'Leather Belt',
        price: 799,
        originalPrice: 1599,
        rating: 4.5,
        image: require('../assets/images/belts.jpg'),
        category: 'Accessories',
        subCategory: 'Belts',
        description: 'Genuine leather belt for men.',
        discount: 50
    },

    // --- BEAUTY (Using Assets) ---
    {
        id: '401',
        name: 'Hydrating Face Wash',
        price: 249,
        originalPrice: 499,
        rating: 4.4,
        image: require('../assets/images/facewash.jpg'),
        category: 'Beauty',
        subCategory: 'Face Wash & Cleanser',
        description: 'Deep cleansing face wash suitable for all skin types.',
        discount: 50
    },
    {
        id: '402',
        name: 'Daily Moisturizer',
        price: 399,
        originalPrice: 699,
        rating: 4.5,
        image: require('../assets/images/moisturizers.jpg'),
        category: 'Beauty',
        subCategory: 'Moisturizers & Creams',
        description: 'Lightweight moisturizer for 24h hydration.',
        discount: 43
    },
    {
        id: '403',
        name: 'Matte Lipstick Red',
        price: 499,
        originalPrice: 999,
        rating: 4.7,
        image: require('../assets/images/lipmakeup.jpg'),
        category: 'Beauty',
        subCategory: 'Lip Makeup',
        description: 'Long stay matte lipstick in bold red.',
        discount: 50
    },
    {
        id: '404',
        name: 'Eye Shadow Palette',
        price: 899,
        originalPrice: 1299,
        rating: 4.3,
        image: require('../assets/images/eyemakeup.jpg'),
        category: 'Beauty',
        subCategory: 'Eye Makeup',
        description: '12-shade eyeshadow palette.',
        discount: 30
    },
    {
        id: '405',
        name: 'Nourishing Shampoo',
        price: 349,
        originalPrice: 699,
        rating: 4.4,
        image: require('../assets/images/shampoo.jpg'),
        category: 'Beauty',
        subCategory: 'Shampoo & Conditioner',
        description: 'Strengthening shampoo for smooth hair.',
        discount: 50
    },
    {
        id: '406',
        name: 'Hair Growth Oil',
        price: 299,
        originalPrice: 599,
        rating: 4.6,
        image: require('../assets/images/hairoil.jpg'),
        category: 'Beauty',
        subCategory: 'Hair Oil & Serum',
        description: 'Herbal oil for hair regrowth.',
        discount: 50
    },
    {
        id: '407',
        name: 'Styling Gel',
        price: 199,
        originalPrice: 399,
        rating: 4.2,
        image: require('../assets/images/stylingproducts.jpg'),
        category: 'Beauty',
        subCategory: 'Styling Products',
        description: 'Strong hold hair styling gel.',
        discount: 50
    },
    {
        id: '408',
        name: 'Luxury Perfume',
        price: 1499,
        originalPrice: 2999,
        rating: 4.8,
        image: require('../assets/images/perfumes.jpg'),
        category: 'Beauty',
        subCategory: 'Perfumes',
        description: 'Premium fragrance with long-lasting scent.',
        discount: 50
    },
    {
        id: '409',
        name: 'Beard Trimmer',
        price: 1299,
        originalPrice: 2499,
        rating: 4.5,
        image: require('../assets/images/trimmers.jpg'),
        category: 'Beauty', // Mapped to Beauty > Grooming in categories.ts
        subCategory: 'Trimmers & Shavers', // Leaf name match
        description: 'Cordless beard trimmer.',
        discount: 48
    },

    // --- GADGETS (Partial web / assets) ---
    {
        id: '501',
        name: 'Wireless Earbuds',
        price: 1999,
        originalPrice: 4999,
        rating: 4.3,
        image: { uri: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800' },
        category: 'Gadgets',
        subCategory: 'Audio Devices', // Needs to match leaf... Wait, Audio Devices is Section. Leaves are Earphones, Headphones.
        description: 'TWS Earbuds with noise cancellation.',
        discount: 60
    },
    // Correction: Valid Leaves for Gadgets -> Audio Devices: 'Earphones', 'Headphones', 'Bluetooth Speakers'
    {
        id: '502',
        name: 'Wireless Earbuds Pro',
        price: 2199,
        originalPrice: 4500,
        rating: 4.5,
        image: { uri: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&q=80&w=800' },
        category: 'Gadgets',
        subCategory: 'Earphones',
        description: 'Pro grade wireless earphones.',
        discount: 51
    },
    {
        id: '503',
        name: 'Over-Ear Headphones',
        price: 2999,
        originalPrice: 5999,
        rating: 4.7,
        image: { uri: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800' },
        category: 'Gadgets',
        subCategory: 'Headphones',
        description: 'Comfortable over-ear headphones with deep bass.',
        discount: 50
    },

    // --- HOME & LIVING ---
    {
        id: '601',
        name: 'Ceramic Dinner Set',
        price: 2499,
        originalPrice: 4999,
        rating: 4.6,
        image: { uri: 'https://images.unsplash.com/photo-1623959679886-bf4047a21fb6?auto=format&fit=crop&q=80&w=800' },
        category: 'Home & Living',
        subCategory: 'Dinner Sets',
        description: 'Elegant 16-piece ceramic dinner set.',
        discount: 50
    },
    {
        id: '602',
        name: 'Cotton Bedsheet',
        price: 899,
        originalPrice: 1799,
        rating: 4.4,
        image: { uri: 'https://images.unsplash.com/photo-1522771753003-24b4d576ef99?auto=format&fit=crop&q=80&w=800' },
        category: 'Home & Living',
        subCategory: 'Bedsheets',
        description: 'Soft double bedsheet with pillow covers.',
        discount: 50
    }
];
