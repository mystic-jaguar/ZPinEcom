import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';

const { width, height } = Dimensions.get('window');

// Data parsed from Categories.txt with Image support
// Items are now objects: { name: string, image: any | null }
const CATEGORY_DATA = [
    {
        id: 'accessories',
        name: 'Accessories',
        icon: 'briefcase', // Feather icon name
        sections: [
            {
                title: 'Bags & Backpacks',
                data: [
                    { name: 'Handbags', image: require('../../assets/images/handbags.jpg') },
                    { name: 'Backpacks', image: require('../../assets/images/backpacks.jpg') },
                    { name: 'Laptop Bags', image: require('../../assets/images/laptopbags.jpg') },
                    { name: 'School bags', image: require('../../assets/images/schoolbags.jpg') },
                    { name: 'Travel/Gym Bags', image: require('../../assets/images/travelbags.jpg') },
                    { name: 'Sling & Clutch Bags', image: require('../../assets/images/slingbags.jpg') }
                ]
            },
            {
                title: 'Wallets & Belts',
                data: [
                    { name: 'Wallets', image: require('../../assets/images/wallets.jpg') },
                    { name: 'Belts', image: require('../../assets/images/belts.jpg') },
                    { name: 'Card Holders', image: require('../../assets/images/cardholders.jpg') },
                    { name: 'Coin Pouches', image: require('../../assets/images/coinpouches.jpg') }
                ]
            },
            {
                title: 'Watches',
                data: [
                    { name: 'Analog', image: require('../../assets/images/analog.jpg') },
                    { name: 'Digital', image: require('../../assets/images/digital.jpg') },
                    { name: 'Smart Watches', image: require('../../assets/images/smartwatches.jpg') },
                    { name: 'Sports Watches', image: require('../../assets/images/sportswatches.jpg') }
                ]
            },
            {
                title: 'Sunglasses & Eyewear',
                data: [
                    { name: 'Sunglasses', image: null },
                    { name: 'Blue Light Glasses', image: null },
                    { name: 'Reading Glasses', image: null },
                    { name: 'Frames', image: null }
                ]
            },
            {
                title: 'Jewellery',
                data: [
                    { name: 'Earrings', image: null },
                    { name: 'Necklaces', image: null },
                    { name: 'Bangles & Bracelets', image: null },
                    { name: 'Rings', image: null },
                    { name: 'Jewellery Sets', image: null }
                ]
            },
            {
                title: 'Hair Accessories',
                data: [
                    { name: 'Clips & Pins', image: null },
                    { name: 'Hair Bands & Scrunchies', image: null },
                    { name: 'Headbands', image: null },
                    { name: 'Bridal Accessories', image: null }
                ]
            },
            {
                title: 'Caps & Hats',
                data: [
                    { name: 'Caps', image: null },
                    { name: 'Hats', image: null },
                    { name: 'Winter Caps', image: null }
                ]
            },
            {
                title: 'Scarves & Stoles',
                data: [
                    { name: 'Scarves', image: null },
                    { name: 'Stoles', image: null },
                    { name: 'Winter Wear', image: null }
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
                    { name: 'Face Wash & Cleanser', image: null },
                    { name: 'Moisturizers & Creams', image: null },
                    { name: 'Sunscreen', image: null },
                    { name: 'Serums & Masks', image: null }
                ]
            },
            {
                title: 'Haircare',
                data: [
                    { name: 'Shampoo & Conditioner', image: null },
                    { name: 'Hair Oil & Serum', image: null },
                    { name: 'Hair Color', image: null },
                    { name: 'Styling Products', image: null }
                ]
            },
            {
                title: 'Makeup',
                data: [
                    { name: 'Face Makeup', image: null },
                    { name: 'Eye Makeup', image: null },
                    { name: 'Lip Makeup', image: null },
                    { name: 'Makeup Kits', image: null }
                ]
            },
            {
                title: 'Personal Care',
                data: [
                    { name: 'Soaps & Body Wash', image: null },
                    { name: 'Deodorants', image: null },
                    { name: 'Oral Care', image: null },
                    { name: 'Feminine Hygiene', image: null }
                ]
            },
            {
                title: 'Grooming',
                data: [
                    { name: 'Shaving & Trimming', image: null },
                    { name: 'Hair Removal', image: null },
                    { name: 'Grooming Kits', image: null },
                    { name: 'Beard & Styling Products', image: null }
                ]
            },
            {
                title: 'Fragrances & Deodorants',
                data: [
                    { name: 'Perfumes', image: null },
                    { name: 'Body Sprays', image: null },
                    { name: 'Roll-Ons', image: null },
                    { name: 'Gift Sets', image: null }
                ]
            },
            {
                title: 'Beauty Tools',
                data: [
                    { name: 'Hair Dryers', image: null },
                    { name: 'Straighteners & Curlers', image: null },
                    { name: 'Trimmers & Shavers', image: null },
                    { name: 'Face & Skin Tools', image: null }
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

export default function CategoriesScreen() {
    const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORY_DATA[0].id);

    const selectedCategory = CATEGORY_DATA.find(c => c.id === selectedCategoryId) || CATEGORY_DATA[0];

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <View style={styles.searchContainer}>
                <SearchBar placeholder="Search categories..." />
            </View>

            <View style={styles.contentContainer}>
                {/* Sidebar */}
                <View style={styles.sidebar}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {CATEGORY_DATA.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
                                    onPress={() => setSelectedCategoryId(cat.id)}
                                >
                                    <View style={[styles.sidebarIcon, isSelected && styles.sidebarIconSelected]}>
                                        <Feather name={cat.icon as any} size={20} color={isSelected ? '#fff' : '#555'} />
                                    </View>
                                    <Text style={[styles.sidebarText, isSelected && styles.sidebarTextSelected]}>
                                        {cat.name}
                                    </Text>
                                    {isSelected && <View style={styles.activeIndicator} />}
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                    <View style={styles.categoryHeader}>
                        <Text style={styles.categoryTitle}>{selectedCategory.name}</Text>
                        <Text style={styles.categorySubtitle}>{selectedCategory.sections.length} Categories</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainScrollContent}>
                        {selectedCategory.sections.map((section, index) => (
                            <View key={index} style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <View style={styles.itemsGrid}>
                                    {section.data.map((item, idx) => (
                                        <TouchableOpacity key={idx} style={styles.itemCard}>
                                            <View style={styles.itemImagePlaceholder}>
                                                {item.image ? (
                                                    <Image source={item.image} style={styles.itemImage} />
                                                ) : (
                                                    <Feather name="image" size={16} color="#ddd" />
                                                )}
                                            </View>
                                            <Text style={styles.itemText}>{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        marginBottom: 10
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    sidebar: {
        width: 100,
        backgroundColor: '#F7F8FA',
        borderRightWidth: 1,
        borderRightColor: '#eee'
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    sidebarItemSelected: {
        backgroundColor: '#FFFBE6' // Light yellow match
    },
    sidebarIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    sidebarIconSelected: {
        backgroundColor: '#FBBF24'
    },
    sidebarText: {
        fontSize: 10,
        textAlign: 'center',
        color: '#666',
        fontWeight: '500'
    },
    sidebarTextSelected: {
        color: '#1a1a1a',
        fontWeight: '700'
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#FBBF24'
    },
    mainContent: {
        flex: 1,
        backgroundColor: '#fff'
    },
    categoryHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5'
    },
    categoryTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 4
    },
    categorySubtitle: {
        fontSize: 12,
        color: '#888'
    },
    mainScrollContent: {
        padding: 20
    },
    sectionContainer: {
        marginBottom: 25
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#333',
        marginBottom: 15
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5
    },
    itemCard: {
        width: '33.33%',
        paddingHorizontal: 5,
        marginBottom: 15,
        alignItems: 'center'
    },
    itemImagePlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: '#f9f9f9',
        borderRadius: 30, // Circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden'
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    itemText: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        lineHeight: 14
    },
});
