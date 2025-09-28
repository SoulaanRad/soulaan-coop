import { View, Text } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={{ 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'white',
      padding: 24 
    }}>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 16,
        textAlign: 'center',
        color: '#1F2937'
      }}>
        Explore
      </Text>
      
      <Text style={{ 
        fontSize: 16, 
        textAlign: 'center',
        color: '#6B7280'
      }}>
        Simple explore page - no complex dependencies
      </Text>
    </View>
  );
}