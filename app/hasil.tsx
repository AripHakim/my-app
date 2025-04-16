import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const HasilPlagiasi = () => {
    const { result, fileNames } = useLocalSearchParams();
    const similarities = JSON.parse(Array.isArray(result) ? result[0] : result);
    const names = JSON.parse(Array.isArray(fileNames) ? fileNames[0] : fileNames);

    return (
        <View style={{ padding: 20, paddingBottom: 50 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Hasil Cek Plagiasi</Text>
            <FlatList
                data={similarities}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <Text style={{ color: item.similarity > 15 ? 'red' : 'green' }}>
                        {`${names[item.doc1_index]} vs ${names[item.doc2_index]}: ${item.similarity.toFixed(2)}% `}
                        {item.similarity > 15 ? 'Plagiat' : 'Tidak Plagiat'}
                    </Text>
                )}
            />
        </View>
    );
};

export default HasilPlagiasi;
