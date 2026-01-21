import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductListing() {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Latest Looks',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
                        <Feather name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                )
            }} />
            <View style={styles.content}>
                <Text style={styles.text}>Product Listing Page</Text>
                <Text style={styles.subText}>Connected from Home Screen</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    text: { fontSize: 20, fontWeight: 'bold' },
    subText: { fontSize: 14, color: '#666', marginTop: 10 }
});
