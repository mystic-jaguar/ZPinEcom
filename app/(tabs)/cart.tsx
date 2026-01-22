import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <Text>Cart Screen Under Construction</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
