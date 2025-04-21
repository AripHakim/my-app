import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter, useNavigation } from 'expo-router';

const SERVER_URL = 'https://winnowing.up.railway.app';

const HomePage = () => {
  const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const navigation = useNavigation();
  

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // Menghilangkan tombol kembali
    });
  }, [navigation]);

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
    if (files.length < 2) {
      setError('Mohon unggah setidaknya 2 file PDF.');
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
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={files}
        keyExtractor={(_, index) => index.toString()}
        ListHeaderComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
              Deteksi Plagiarisme
            </Text>
            <Button title="Pilih File PDF" onPress={pickDocuments} />
            <View style={{ marginVertical: 10 }}>
              <Button title="Cek Plagiasi" onPress={handleSubmit} disabled={files.length < 2} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => removeFile(index)} style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: 'blue', marginVertical: 5 }}>
              {item.name} (Tap untuk hapus)
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
            <View>
              {error ? <Text style={{ color: 'red', margin: 20 }}>{error}</Text> : null}
              <View style={{ height: 100 }} />
            </View>
          }          
      />

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9',
        position: 'absolute',
        bottom: 0,
        width: '100%',
      }}>
        <Button title="Beranda" onPress={() => router.push('/')} />
        <Button title="Riwayat" onPress={() => router.push('/history')} />
      </View>
    </View>
  );
};

export default HomePage;
