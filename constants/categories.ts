
export interface CategoryItem {
    name: string;
    image: any | null;
}

export interface CategorySection {
    title: string;
    data: CategoryItem[];
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    sections: CategorySection[];
}

export const CATEGORY_DATA: Category[] = [
    {
        id: 'accessories',
        name: 'Accessories',
        icon: 'briefcase', // Feather icon name
        sections: [
            {
                title: 'Bags & Backpacks',
                data: [
                    { name: 'Handbags', image: require('../assets/images/handbags.jpg') },
                    { name: 'Backpacks', image: require('../assets/images/backpacks.jpg') },
                    { name: 'Laptop Bags', image: require('../assets/images/laptopbags.jpg') },
                    { name: 'School bags', image: require('../assets/images/schoolbags.jpg') },
                    { name: 'Travel/Gym Bags', image: require('../assets/images/travelbags.jpg') },
                    { name: 'Sling & Clutch Bags', image: require('../assets/images/slingbags.jpg') }
                ]
            },
            {
                title: 'Wallets & Belts',
                data: [
                    { name: 'Wallets', image: require('../assets/images/wallets.jpg') },
                    { name: 'Belts', image: require('../assets/images/belts.jpg') },
                    { name: 'Card Holders', image: require('../assets/images/cardholders.jpg') },
                    { name: 'Coin Pouches', image: require('../assets/images/coinpouches.jpg') }
                ]
            },
            {
                title: 'Watches',
                data: [
                    { name: 'Analog', image: require('../assets/images/analog.jpg') },
                    { name: 'Digital', image: require('../assets/images/digital.jpg') },
                    { name: 'Smart Watches', image: require('../assets/images/smartwatches.jpg') },
                    { name: 'Sports Watches', image: require('../assets/images/sportswatches.jpg') }
                ]
            },
            {
                title: 'Sunglasses & Eyewear',
                data: [
                    { name: 'Sunglasses', image: require('../assets/images/sunglasses.jpg') },
                    { name: 'Blue Light Glasses', image: require('../assets/images/bluelightglasses.jpg') },
                    { name: 'Reading Glasses', image: require('../assets/images/readingglasses.jpg') },
                    { name: 'Frames', image: require('../assets/images/frames.jpg') }
                ]
            },
            {
                title: 'Jewellery',
                data: [
                    { name: 'Earrings', image: require('../assets/images/earrings.jpg') },
                    { name: 'Necklaces', image: require('../assets/images/necklaces.jpg') },
                    { name: 'Bangles & Bracelets', image: require('../assets/images/bangles.jpg') },
                    { name: 'Rings', image: require('../assets/images/rings.jpg') },
                    { name: 'Jewellery Sets', image: require('../assets/images/jewellerysets.jpg') }
                ]
            },
            {
                title: 'Hair Accessories',
                data: [
                    { name: 'Clips & Pins', image: require('../assets/images/clips.jpg') },
                    { name: 'Hair Bands & Scrunchies', image: require('../assets/images/hairbands.jpg') },
                    { name: 'Headbands', image: require('../assets/images/headbands.jpg') },
                    { name: 'Bridal Accessories', image: require('../assets/images/bridalaccessories.jpg') }
                ]
            },
            {
                title: 'Caps & Hats',
                data: [
                    { name: 'Caps', image: require('../assets/images/caps.jpg') },
                    { name: 'Hats', image: require('../assets/images/hats.jpg') },
                    { name: 'Winter Caps', image: require('../assets/images/wintercaps.jpg') }
                ]
            },
            {
                title: 'Scarves & Stoles',
                data: [
                    { name: 'Scarves', image: require('../assets/images/scarves.jpg') },
                    { name: 'Stoles', image: require('../assets/images/stoles.jpg') },
                    { name: 'Winter Wear', image: require('../assets/images/winterwear.jpg') }
                ]
            }
        ]
    },
    {
        id: 'beauty',
        name: 'Beauty',
        icon: 'smile',
        sections: [
            {
                title: 'Skincare',
                data: [
                    { name: 'Face Wash & Cleanser', image: require('../assets/images/facewash.jpg') },
                    { name: 'Moisturizers & Creams', image: require('../assets/images/moisturizers.jpg') },
                    { name: 'Sunscreen', image: require('../assets/images/sunscreen.jpg') },
                    { name: 'Serums & Masks', image: require('../assets/images/serums.jpg') }
                ]
            },
            {
                title: 'Haircare',
                data: [
                    { name: 'Shampoo & Conditioner', image: require('../assets/images/shampoo.jpg') },
                    { name: 'Hair Oil & Serum', image: require('../assets/images/hairoil.jpg') },
                    { name: 'Hair Color', image: require('../assets/images/haircolor.jpg') },
                    { name: 'Styling Products', image: require('../assets/images/stylingproducts.jpg') }
                ]
            },
            {
                title: 'Makeup',
                data: [
                    { name: 'Face Makeup', image: require('../assets/images/facemakeup.jpg') },
                    { name: 'Eye Makeup', image: require('../assets/images/eyemakeup.jpg') },
                    { name: 'Lip Makeup', image: require('../assets/images/lipmakeup.jpg') },
                    { name: 'Makeup Kits', image: require('../assets/images/makeupkits.jpg') }
                ]
            },
            {
                title: 'Personal Care',
                data: [
                    { name: 'Soaps & Body Wash', image: require('../assets/images/soap.jpg') },
                    { name: 'Deodorants', image: require('../assets/images/deodorants.jpg') },
                    { name: 'Oral Care', image: require('../assets/images/oralcare.jpg') },
                    { name: 'Feminine Hygiene', image: require('../assets/images/femininehygiene.jpg') }
                ]
            },
            {
                title: 'Grooming',
                data: [
                    { name: 'Shaving & Trimming', image: require('../assets/images/shaving.jpg') },
                    { name: 'Hair Removal', image: require('../assets/images/hairremoval.jpg') },
                    { name: 'Grooming Kits', image: require('../assets/images/groomingkits.jpg') },
                    { name: 'Beard & Styling Products', image: require('../assets/images/beard.jpg') }
                ]
            },
            {
                title: 'Fragrances & Deodorants',
                data: [
                    { name: 'Perfumes', image: require('../assets/images/perfumes.jpg') },
                    { name: 'Body Sprays', image: require('../assets/images/bodysprays.jpg') },
                    { name: 'Roll-Ons', image: require('../assets/images/rollons.jpg') },
                    { name: 'Gift Sets', image: require('../assets/images/giftsets.jpg') }
                ]
            },
            {
                title: 'Beauty Tools',
                data: [
                    { name: 'Hair Dryers', image: require('../assets/images/hairdryers.jpg') },
                    { name: 'Straighteners & Curlers', image: require('../assets/images/straighteners.jpg') },
                    { name: 'Trimmers & Shavers', image: require('../assets/images/trimmers.jpg') },
                    { name: 'Face & Skin Tools', image: require('../assets/images/faceandskintools.jpg') }
                ]
            }
        ]
    },
    {
        id: 'home',
        name: 'Home & Living',
        icon: 'home',
        sections: [
            {
                title: 'Kitchenware',
                data: [
                    { name: 'Cookware', image: null },
                    { name: 'Utensils', image: null },
                    { name: 'Storage Containers', image: null },
                    { name: 'Kitchen Tools', image: null }
                ]
            },
            {
                title: 'Dining Essentials',
                data: [
                    { name: 'Dinner Sets', image: null },
                    { name: 'Plates & Bowls', image: null },
                    { name: 'Glasses & Mugs', image: null },
                    { name: 'Serving Items', image: null }
                ]
            },
            {
                title: 'Storage & Organizers',
                data: [
                    { name: 'Storage Boxes', image: null },
                    { name: 'Wardrobe Organizers', image: null },
                    { name: 'Kitchen Organizers', image: null },
                    { name: 'Multipurpose Racks', image: null }
                ]
            },
            {
                title: 'Cleaning & Utility',
                data: [
                    { name: 'Cleaning Tools', image: null },
                    { name: 'Cleaning Supplies', image: null },
                    { name: 'Laundry Items', image: null },
                    { name: 'Utility Accessories', image: null }
                ]
            },
            {
                title: 'Bedding & Linen',
                data: [
                    { name: 'Bedsheets', image: null },
                    { name: 'Blankets & Quilts', image: null },
                    { name: 'Pillow Covers', image: null },
                    { name: 'Towels', image: null }
                ]
            },
            {
                title: 'Bathroom Accessories',
                data: [
                    { name: 'Soap Dispensers & Holders', image: null },
                    { name: 'Bathroom Racks', image: null },
                    { name: 'Mirrors', image: null },
                    { name: 'Bath Essentials', image: null }
                ]
            },
            {
                title: 'Home Improvement',
                data: [
                    { name: 'Tools & Hardware', image: null },
                    { name: 'Electrical Fittings', image: null },
                    { name: 'Plumbing Essentials', image: null },
                    { name: 'Repair & Maintenance', image: null }
                ]
            }
        ]
    },
    {
        id: 'gadgets',
        name: 'Gadgets',
        icon: 'smartphone',
        sections: [
            {
                title: 'Mobile Accessories',
                data: [
                    { name: 'Mobile Covers', image: null },
                    { name: 'Screen Guards', image: null },
                    { name: 'Mobile Holders', image: null },
                    { name: 'Cables', image: null }
                ]
            },
            {
                title: 'Audio Devices',
                data: [
                    { name: 'Earphones', image: null },
                    { name: 'Headphones', image: null },
                    { name: 'Bluetooth Speakers', image: null }
                ]
            },
            {
                title: 'Smart Devices',
                data: [
                    { name: 'Smart Watches', image: null },
                    { name: 'Fitness Bands', image: null },
                    { name: 'Smart Accessories', image: null }
                ]
            },
            {
                title: 'Computer Accessories',
                data: [
                    { name: 'Keyboards & Mouse', image: null },
                    { name: 'Laptop Bags', image: null },
                    { name: 'Webcam & Mic', image: null },
                    { name: 'USB & Storage Devices', image: null }
                ]
            },
            {
                title: 'Gaming Accessories',
                data: [
                    { name: 'Controllers', image: null },
                    { name: 'Gaming Mouse & Keyboard', image: null },
                    { name: 'Headsets', image: null },
                    { name: 'Gaming Chairs', image: null }
                ]
            },
            {
                title: 'Chargers & Power Banks',
                data: [
                    { name: 'Mobile Chargers', image: null },
                    { name: 'Fast Chargers', image: null },
                    { name: 'Power Banks', image: null },
                    { name: 'Multi-port Chargers', image: null }
                ]
            }
        ]
    },
    {
        id: 'appliances',
        name: 'Electrical Appliances',
        icon: 'zap',
        sections: [
            {
                title: 'Large Appliances',
                data: [
                    { name: 'Refrigerator', image: null },
                    { name: 'Washing Machine', image: null },
                    { name: 'Air Conditioner', image: null },
                    { name: 'Television', image: null }
                ]
            },
            {
                title: 'Small Appliances',
                data: [
                    { name: 'Mixer Grinder', image: null },
                    { name: 'Toaster', image: null },
                    { name: 'Electric Kettle', image: null },
                    { name: 'Juicer', image: null }
                ]
            },
            {
                title: 'Kitchen Appliances',
                data: [
                    { name: 'Microwave Oven', image: null },
                    { name: 'Induction Cooktop', image: null },
                    { name: 'Gas Stove', image: null },
                    { name: 'Rice Cooker', image: null }
                ]
            },
            {
                title: 'Heating & Cooling',
                data: [
                    { name: 'Room Heater', image: null },
                    { name: 'Geyser', image: null },
                    { name: 'Fans', image: null },
                    { name: 'Air Coolers', image: null }
                ]
            },
            {
                title: 'Personal Appliances',
                data: [
                    { name: 'Iron', image: null },
                    { name: 'Trimmer & Shaver', image: null },
                    { name: 'Hair Dryer', image: null },
                    { name: 'Straightener', image: null }
                ]
            }
        ]
    }
];
