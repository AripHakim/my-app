import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const HasilPlagiasi = () => {
  const { result, fileNames } = useLocalSearchParams();
  const similarities = JSON.parse(Array.isArray(result) ? result[0] : result);
  const names = JSON.parse(Array.isArray(fileNames) ? fileNames[0] : fileNames);

  const [sortAscending, setSortAscending] = useState(false);

  const getStatusAndColor = (similarity: number) => {
    if (similarity <= 5) return { status: 'Sangat Aman', color: 'green' };
    else if (similarity <= 15) return { status: 'Perlu Diperiksa', color: 'orange' };
    else return { status: 'Plagiat', color: 'red' };
  };

  const sortedData = [...similarities].sort((a, b) =>
    sortAscending ? a.similarity - b.similarity : b.similarity - a.similarity
  );

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', backgroundColor: '#eee', paddingVertical: 8, borderBottomWidth: 1 }}>
      <Text style={{ flex: 3, fontWeight: 'bold', textAlign: 'center' }}>Dokumen 1</Text>
      <Text style={{ flex: 3, fontWeight: 'bold', textAlign: 'center' }}>Dokumen 2</Text>
      <TouchableOpacity
        style={{ flex: 2 }}
        onPress={() => setSortAscending(!sortAscending)}
      >
        <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
          Similarity {sortAscending ? '↑' : '↓'}
        </Text>
      </TouchableOpacity>
      <Text style={{ flex: 2, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
    </View>
  );

  const renderItem = ({ item }: any) => {
    const { status, color } = getStatusAndColor(item.similarity);
    return (
      <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#ccc' }}>
        <Text style={{ flex: 3, textAlign: 'center' }}>{names[item.doc1_index]}</Text>
        <Text style={{ flex: 3, textAlign: 'center' }}>{names[item.doc2_index]}</Text>
        <Text style={{ flex: 2, textAlign: 'center' }}>{item.similarity.toFixed(2)}%</Text>
        <Text style={{ flex: 2, textAlign: 'center', color }}>{status}</Text>
      </View>
    );
  };

  return (
    <View style={{ padding: 20, paddingBottom: 50 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
        Hasil Cek Plagiasi
      </Text>

      <FlatList
        data={sortedData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
      />
    </View>
  );
};

export default HasilPlagiasi;
