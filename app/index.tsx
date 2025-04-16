import React, { useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

const SERVER_URL = 'https://winnowing.up.railway.app'; // Sesuaikan dengan backend Flask

const PlagiarismDetector = () => {
    const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
    const [error, setError] = useState('');
    const router = useRouter();

    const pickDocuments = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                multiple: true, // ✅ Memungkinkan pemilihan banyak file
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                setError('Tidak ada file yang dipilih.');
                return;
            }

            let newFiles = [...files];

            result.assets.forEach(file => {
                if (!newFiles.some(existingFile => existingFile.uri === file.uri)) {
                    newFiles.push({ name: file.name || 'Unnamed', uri: file.uri });
                } else {
                    setError('Beberapa file sudah dipilih sebelumnya.');
                }
            });

            setFiles(newFiles);
        } catch (err) {
            console.error('Error picking document:', err);
            setError('Gagal memilih dokumen.');
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const extractTextFromPDF = async (fileUri: string, fileName: string) => {
        try {
            const formData = new FormData();
            formData.append('pdf', {
                uri: fileUri,
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
            const extractedTexts = await Promise.all(files.map(file => extractTextFromPDF(file.uri, file.name)));

            if (extractedTexts.some(text => text === '')) {
                setError('Gagal mengekstrak teks dari salah satu dokumen.');
                return;
            }

            const response = await fetch(`${SERVER_URL}/plagiarism`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documents: extractedTexts,
                    k: 5,
                    window_size: 4,
                }),
            });

            if (!response.ok) {
                throw new Error('Gagal menghubungkan ke server.');
            }

            const data = await response.json();

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
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', paddingBottom: 20, textAlign: 'center' }}>Plagiarism Detector</Text>           
            <Button title="Pilih File PDF" onPress={pickDocuments} />
            <Button title="Cek Plagiasi" onPress={handleSubmit} disabled={files.length < 2} />

            {files.length > 0 && (
                <FlatList
                    data={files}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => removeFile(index)}>
                            <Text style={{ color: 'blue', marginVertical: 5 }}>{item.name} (Tap untuk hapus)</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
            {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}
        </View>
    );
};

export default PlagiarismDetector;
