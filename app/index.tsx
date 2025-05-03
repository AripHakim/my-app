import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Modal, 
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SERVER_URL = 'https://winnowing.up.railway.app';

const HomePage = () => {
  const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickDocuments = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) {
        setError('Tidak ada file yang dipilih.');
        return;
      }

      let newFiles = [...files];
      let duplicateFound = false;

      result.assets.forEach(file => {
        if (!newFiles.some(existing => existing.uri === file.uri)) {
          newFiles.push({ name: file.name || 'Unnamed', uri: file.uri });
        } else {
          duplicateFound = true;
        }
      });

      if (duplicateFound) {
        setError('Beberapa file sudah dipilih sebelumnya.');
      }

      setFiles(newFiles);
    } catch (err) {
      console.error('Gagal memilih dokumen:', err);
      setError('Gagal memilih dokumen.');
    }
  };

  const removeFile = (index: number) => {
    setError('');
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllFiles = () => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus semua file?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', onPress: () => setFiles([]) },
      ]
    );
  };

  const extractTextFromPDF = async (fileUri: string, fileName: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error('File tidak ditemukan di path tersebut');

      const formData = new FormData();
      formData.append('pdf', {
        uri: fileInfo.uri,
        name: fileName,
        type: 'application/pdf',
      } as any);

      const response = await fetch(`${SERVER_URL}/extract-text`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.text;
    } catch (err) {
      console.error('Gagal mengekstrak teks dari PDF:', err);
      setError('Gagal mengekstrak teks dari PDF.');
      return '';
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    
    if (files.length < 2) {
      setError('Mohon unggah setidaknya 2 file PDF.');
      setLoading(false);
      return;
    }

    try {
      const extractedTexts = await Promise.all(
        files.map(async (file) => {
          const text = await extractTextFromPDF(file.uri, file.name);
          return text;
        })
      );

      if (extractedTexts.some(text => text === '')) {
        setError('Gagal mengekstrak teks dari salah satu dokumen.');
        setLoading(false);
        return;
      }

      const documents = files.map((file, index) => ({
        name: file.name,
        text: extractedTexts[index]
      }));

      const response = await fetch(`${SERVER_URL}/plagiarism`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, k: 5, window_size: 4 })
      });

      const data = await response.json();

      if (!response.ok || !data.similarities) {
        throw new Error(data?.error || 'Gagal menerima hasil dari server.');
      }

      router.push({
        pathname: "/hasil",
        params: {
          result: JSON.stringify(data.similarities),
          fileNames: JSON.stringify(files.map(file => file.name))
        }
      });
    } catch (error) {
      console.error('Terjadi kesalahan saat memproses file:', error);
      setError('Terjadi kesalahan saat memproses file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Deteksi Plagiarisme</Text>
          <Text style={styles.subtitle}>Unggah 2 file PDF atau lebih untuk memulai</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={pickDocuments}>
              <Ionicons name="document-attach" size={20} color="white" />
              <Text style={styles.buttonText}>Pilih File PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, files.length < 2 && styles.disabledButton]} 
              onPress={handleSubmit} 
              disabled={files.length < 2 || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#007AFF" />
                  <Text style={styles.secondaryButtonText}>Cek Plagiasi</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {files.length > 0 && (
            <TouchableOpacity 
              style={styles.fileListHeader}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.sectionTitle}>File Terpilih ({files.length})</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Modal untuk menampilkan daftar file */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Daftar File</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={files}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.modalFileItem}>
                    <Ionicons name="document" size={18} color="#555" />
                    <Text style={styles.modalFileName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeFile(index)}>
                      <Ionicons name="close-circle" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Belum ada file yang dipilih</Text>
                }
              />
              
              {files.length > 0 && (
                <TouchableOpacity 
                  style={styles.deleteAllButton}
                  onPress={removeAllFiles}
                >
                  <Ionicons name="trash" size={16} color="white" />
                  <Text style={styles.deleteAllButtonText}>Hapus Semua</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButtonActive}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="time" size={24} color="#007AFF" />
          <Text style={styles.navText}>Riwayat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 25,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: '#ccc',
  },
  buttonText: {
    fontFamily: 'Nunito-Regular',
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButtonText: {
    fontFamily: 'Nunito-Regular',
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 10,
  },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#ff4444',
    marginLeft: 8,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  modalFileName: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    padding: 20,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  deleteAllButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#E7EAF9',
  },
  navButtonActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderColor: '#007AFF',
    borderTopWidth: 1.5,
  },
  navText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  navTextActive: {
    fontSize: 12,
    color: '#f9f6e7',
    marginTop: 4,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default HomePage;