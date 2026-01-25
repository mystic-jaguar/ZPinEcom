import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import { CATEGORY_DATA, Category } from '../../constants/categories';

const { width } = Dimensions.get('window');

const Sidebar = ({
    categories,
    selectedId,
    onSelect
}: {
    categories: Category[];
    selectedId: string;
    onSelect: (id: string) => void;
}) => {
    return (
        <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {categories.map((cat) => {
                    const isSelected = selectedId === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
                            onPress={() => onSelect(cat.id)}
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
    );
};

export default function CategoriesScreen() {
    const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORY_DATA[0].id);
    const router = useRouter();

    const selectedCategory = CATEGORY_DATA.find(c => c.id === selectedCategoryId) || CATEGORY_DATA[0];

    const handleCategoryPress = (subCategoryName: string) => {
        router.push({
            pathname: '/product-listing',
            params: {
                categoryName: selectedCategory.name,
                subCategoryName: subCategoryName
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <View style={styles.searchContainer}>
                <SearchBar placeholder="Search categories..." />
            </View>

            <View style={styles.contentContainer}>
                {/* Sidebar */}
                <Sidebar
                    categories={CATEGORY_DATA}
                    selectedId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                />

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
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.itemCard}
                                            onPress={() => handleCategoryPress(item.name)}
                                        >
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
