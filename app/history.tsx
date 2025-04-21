import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, Button,
  TouchableOpacity, Modal
} from 'react-native';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';

const SERVER_URL = 'https://winnowing.up.railway.app';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [sortAscending, setSortAscending] = useState(false);

  const { result, fileNames } = useLocalSearchParams();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerShown: false,
    });
  }, [navigation]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/history`);
      const data = await response.json();
      setHistory(data.history);
    } catch (err) {
      console.error('Gagal mengambil data riwayat:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatus = (similarity) => {
    if (similarity <= 5) return { status: 'Sangat Aman', color: 'green' };
    else if (similarity <= 15) return { status: 'Perlu Diperiksa', color: 'orange' };
    return { status: 'Plagiat', color: 'red' };
  };

  const sortedData = [...history].sort((a, b) =>
    sortAscending ? a.similarity - b.similarity : b.similarity - a.similarity
  );

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', backgroundColor: '#eee', paddingVertical: 8, borderBottomWidth: 1 }}>
      <Text style={{ flex: 3, fontWeight: 'bold', textAlign: 'center' }}>Dokumen 1</Text>
      <Text style={{ flex: 3, fontWeight: 'bold', textAlign: 'center' }}>Dokumen 2</Text>
      <TouchableOpacity style={{ flex: 2 }} onPress={() => setSortAscending(!sortAscending)}>
        <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
          Similarity {sortAscending ? '↑' : '↓'}
        </Text>
      </TouchableOpacity>
      <Text style={{ flex: 2, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const { status, color } = getStatus(item.similarity);

    return (
      <TouchableOpacity
        style={{ flexDirection: 'row', paddingVertical: 6 }}
        onPress={() => {
          setSelectedDate(formatDate(item.checked_at));
          setModalVisible(true);
        }}
      >
        <Text style={{ flex: 3, textAlign: 'center' }}>{item.doc1_name}</Text>
        <Text style={{ flex: 3, textAlign: 'center' }}>{item.doc2_name}</Text>
        <Text style={{ flex: 2, textAlign: 'center' }}>{item.similarity.toFixed(2)}%</Text>
        <Text style={{ flex: 2, textAlign: 'center', color }}>{status}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', margin: 20, textAlign: 'center' }}>
        Riwayat Pemeriksaan
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : history.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Belum ada riwayat pemeriksaan.</Text>
      ) : (
        <FlatList
          data={sortedData}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        />
      )}

      {/* Navigasi bawah */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          padding: 10,
          borderTopWidth: 1,
          borderColor: '#ccc',
          backgroundColor: '#f9f9f9',
          position: 'absolute',
          bottom: 0,
          width: '100%',
        }}
      >
        <Button title="Beranda" onPress={() => router.push('/')} />
        <Button title="Riwayat" onPress={() => router.push('/history')} />
      </View>

      {/* Modal tampilkan tanggal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 10,
            minWidth: '70%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Tanggal Pemeriksaan</Text>
            <Text style={{ fontWeight: 'bold' }}>{selectedDate}</Text>
            <Button title="Tutup" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HistoryPage;
