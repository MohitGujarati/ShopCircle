import { Colors } from '@/constants/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const ProductAdd = () => {
    return (
        <ScrollView style={styles.container}>
            <View >
                <Text>ProductAdd</Text>
            </View>
        </ScrollView>
    )
}

export default ProductAdd

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
        backgroundColor: Colors.background,
    }
})