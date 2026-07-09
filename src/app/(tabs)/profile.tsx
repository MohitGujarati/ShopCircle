import ProfilePage from '@/components/ProfilePage'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProfilScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ProfilePage />


    </SafeAreaView>
  )
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
})