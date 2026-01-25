import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRODUCTS, Product } from '../constants/products';

export default function ProductListing() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { categoryName, subCategoryName } = params;

    // Filter products based on category and subCategory (if present)
    const filteredProducts = PRODUCTS.filter(product => {
        if (subCategoryName) {
            return product.subCategory === subCategoryName;
        }
        // Fallback to category level if no subcategory (though current flow sends subCategory)
        return product.category === categoryName;
    });

    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/product/${item.id}`)}
        >
            <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.productImage} />
                ) : (
                    <View style={[styles.productImage, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Feather name="image" size={24} color="#ccc" />
                    </View>
                )}
                <TouchableOpacity style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={20} color="#333" />
                </TouchableOpacity>
                {item.discount > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{item.discount}% OFF</Text>
                    </View>
                )}
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productDescription} numberOfLines={1}>{item.description}</Text>

                <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    {item.originalPrice && (
                        <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    )}
                </View>

                <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: (subCategoryName as string) || (categoryName as string) || 'Products',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
                        <Feather name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                ),
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#1a1a1a' }
            }} />

            <View style={styles.content}>
                {filteredProducts.length > 0 ? (
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderProductItem}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Feather name="shopping-bag" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No products found in this category.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { flex: 1 },
    listContent: { padding: 10 },
    columnWrapper: { justifyContent: 'space-between' },
    productCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        // Shadow for Android
        elevation: 2
    },
    imageContainer: {
        height: 150,
        backgroundColor: '#f9f9f9',
        position: 'relative'
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    discountBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#FBBF24',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1a1a1a'
    },
    productInfo: {
        padding: 10
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4
    },
    productDescription: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginRight: 6
    },
    originalPrice: {
        fontSize: 12,
        color: '#999',
        textDecorationLine: 'line-through'
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    ratingText: {
        fontSize: 12,
        color: '#555',
        marginLeft: 4,
        fontWeight: '500'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: '#888'
    }
});
