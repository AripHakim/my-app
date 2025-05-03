import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  FlatList,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns-tz';

const SERVER_URL = 'https://winnowing.up.railway.app';

const HistoryPage = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [currentDocContent, setCurrentDocContent] = useState<{
    name: string;
    text: string;
  } | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const router = useRouter();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/history`);
      const json = await response.json();
      setHistoryData(json.history);
    } catch (error) {
      console.error('Gagal mengambil riwayat:', error);
      Alert.alert('Error', 'Gagal memuat riwayat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // Gunakan format 24 jam
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getStatusAndColor = (similarity: number) => {
    if (similarity <= 5) return { status: 'Sangat Aman', color: '#4CAF50', bgColor: '#E8F5E9' };
    else if (similarity <= 15) return { status: 'Perlu Diperiksa', color: '#FF9800', bgColor: '#FFF3E0' };
    else return { status: 'Plagiat', color: '#F44336', bgColor: '#FFEBEE' };
  };

  const getDocumentContent = async (docId: number, docType: 'doc1'|'doc2') => {
    try {
      setLoadingDoc(true);
      const response = await fetch(`${SERVER_URL}/history-doc/${docId}/${docType}`);
      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Fetching document with:', { docId, docType });

      return data.dokumen;
    } catch (error) {
      console.error('Gagal mengambil dokumen:', error);
      Alert.alert('Error', 'Gagal memuat dokumen');
      return null;
    } finally {
      setLoadingDoc(false);
    }
  };

  const openDocument = async (docId: number, docType: 'doc1'|'doc2') => {
    const docContent = await getDocumentContent(docId, docType);
    if (docContent) {
      setCurrentDocContent(docContent);
      setDocModalVisible(true);
    }
  };

  const calculateSummaries = (similarities: any[], fileNames: string[]) => {
    return fileNames.map((name) => {
      const comparisons = similarities.filter(
        (s: any) => s.doc1_name === name || s.doc2_name === name
      );

      const averageSimilarity =
        comparisons.reduce((acc, s) => acc + s.similarity, 0) /
        (fileNames.length - 1);

      return {
        fileName: name,
        averageSimilarity,
        allComparisons: comparisons.map((s: any) => ({
          id: s.id,
          comparedTo: s.doc1_name === name ? s.doc2_name : s.doc1_name,
          similarity: s.similarity,
          doc1_name: s.doc1_name,
          doc2_name: s.doc2_name,
        })),
      };
    });
  };

  const toggleSession = (timestamp: string) => {
    setExpandedSession(expandedSession === timestamp ? null : timestamp);
  };

  const openComparisonModal = (item: any) => {
    const sorted = [...item.allComparisons].sort((a, b) => b.similarity - a.similarity);
    setSelectedDoc({ ...item, allComparisons: sorted });
    setModalVisible(true);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setDeleting(true);
      const response = await fetch(`${SERVER_URL}/delete-session/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Gagal menghapus sesi');
      }
      
      await fetchHistory();
      Alert.alert('Sukses', 'Sesi berhasil dihapus');
    } catch (error) {
      console.error('Gagal menghapus sesi:', error);
      Alert.alert('Error', 'Gagal menghapus sesi');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (sessionId: string) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus sesi ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', onPress: () => deleteSession(sessionId) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Riwayat Pemeriksaan</Text>
          <Text style={styles.subtitle}>Daftar sesi pemeriksaan sebelumnya</Text>

          {historyData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>Belum ada riwayat pemeriksaan</Text>
            </View>
          ) : (
            <FlatList
              data={historyData}
              keyExtractor={(item) => item.session_id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item: session }) => {
                const isExpanded = expandedSession === session.session_id;
                const fileSet = new Set<string>();
                session.results.forEach((res: any) => {
                  fileSet.add(res.doc1_name);
                  fileSet.add(res.doc2_name);
                });
                const fileNames = Array.from(fileSet);
                const totalDocuments = fileNames.length; // Hitung total dokumen
                let summaries = isExpanded
                  ? calculateSummaries(session.results, fileNames)
                  : [];

                  if (isExpanded) {
                    summaries = summaries.sort((a, b) => b.averageSimilarity - a.averageSimilarity);
                  }

                return (
                  <View style={styles.sessionContainer}>
                    <TouchableOpacity 
                      onPress={() => toggleSession(session.session_id)}
                      style={styles.sessionHeader}
                    >
                      <View style={styles.sessionHeaderContent}>
                        <Ionicons 
                          name={isExpanded ? "folder-open" : "folder"} 
                          size={20} 
                          color="#555" 
                        />
                        <Text style={styles.sessionTitle}>
                          {formatDateTime(session.session_id)}
                        </Text>
                      </View>
                      <View style={styles.sessionHeaderActions}>
                        <Text style={styles.totalDocumentsText}>
                          {totalDocuments} Dokumen
                        </Text>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#666" 
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.sessionContent}>
                        {summaries.map((item) => {
                          const { status, color, bgColor } = getStatusAndColor(item.averageSimilarity);
                          return (
                            <TouchableOpacity 
                              key={item.fileName} 
                              onPress={() => openComparisonModal(item)}
                              style={[styles.documentItem, { backgroundColor: bgColor }]}
                            >
                              <View style={styles.documentInfo}>
                                <Ionicons name="document-text" size={18} color="#555" />
                                <Text style={styles.documentName} numberOfLines={1}>
                                  {item.fileName}
                                </Text>
                              </View>
                              <View style={styles.documentStats}>
                                <Text style={[styles.similarityValue, { color }]}>
                                  {item.averageSimilarity.toFixed(2)}%
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: color }]}>
                                  <Text style={styles.statusText}>{status}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => confirmDelete(session.session_id)}
                          disabled={deleting}
                        >
                          {deleting ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <>
                              <Ionicons name="trash" size={16} color="white" />
                              <Text style={styles.deleteButtonText}>Hapus Sesi</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* Modal Perbandingan */}
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalContainer}
              onPress={() => setModalVisible(false)}
            >
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons name="document-text" size={20} color="#007AFF" />
                    <Text style={styles.modalTitle}>Detail Perbandingan</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalFileName} numberOfLines={2}>
                  {selectedDoc?.fileName}
                </Text>
                
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonHeaderText}>Dokumen Pembanding</Text>
                  <Text style={styles.comparisonHeaderText}>Persentase</Text>
                </View>
                
                <FlatList
                  data={selectedDoc?.allComparisons || []}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item: comp, index }) => {
                    const { status, color } = getStatusAndColor(comp.similarity);
                    return (
                      <View style={[
                        styles.comparisonItem,
                        index % 2 === 0 && styles.comparisonItemEven
                      ]}>
                        <View style={styles.comparisonTextContainer}>
                          <Text style={styles.comparisonText} numberOfLines={1}>
                            {comp.comparedTo}
                          </Text>
                          <View style={styles.docActions}>
                            <TouchableOpacity 
                              onPress={() => openDocument(comp.id, 'doc1')}
                              style={styles.viewDocButton}
                            >
                              <Ionicons name="eye" size={14} color="#007AFF" />
                              <Text style={styles.viewDocButtonText}>Doc 1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => openDocument(comp.id, 'doc2')}
                              style={styles.viewDocButton}
                            >
                              <Ionicons name="eye" size={14} color="#007AFF" />
                              <Text style={styles.viewDocButtonText}>Doc 2</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.comparisonValue}>
                          <Text style={[styles.comparisonPercent, { color }]}>
                            {comp.similarity.toFixed(2)}%
                          </Text>
                          <View style={[styles.comparisonStatus, { backgroundColor: color }]}>
                            <Text style={styles.comparisonStatusText}>{status}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                  initialNumToRender={10}
                  maxToRenderPerBatch={5}
                  windowSize={7}
                />
              </Pressable>
            </Pressable>
          </View>
        </Modal>

        {/* Modal Dokumen */}
        <Modal
          visible={docModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDocModalVisible(false)}
        >
          <View style={styles.docModalOverlay}>
            <Pressable 
              style={styles.docModalContainer}
              onPress={() => setDocModalVisible(false)}
            >
              <Pressable style={styles.docModalContent} onPress={(e) => e.stopPropagation()}>
                <View style={styles.docModalHeader}>
                  <Text style={styles.docModalTitle} numberOfLines={1}>
                    {currentDocContent?.name || 'Dokumen'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setDocModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {loadingDoc ? (
                  <View style={styles.docLoadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.docLoadingText}>Memuat dokumen...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.docContentContainer}>
                    <Text selectable style={styles.docContentText}>
                      {currentDocContent?.text || 'Tidak ada konten'}
                    </Text>
                  </ScrollView>
                )}
              </Pressable>
            </Pressable>
          </View>
        </Modal>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButtonActive}
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
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  sessionContainer: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  sessionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  totalDocumentsText: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  sessionContent: {
    padding: 12,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentName: {
    marginLeft: 10,
    color: '#333',
    flexShrink: 1,
  },
  documentStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  similarityValue: {
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  modalFileName: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    fontSize: 14,
    color: '#555',
    backgroundColor: '#f9f9f9',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  comparisonHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  comparisonItemEven: {
    backgroundColor: '#fafafa',
  },
  comparisonTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  comparisonText: {
    fontSize: 14,
    color: '#333',
  },
  docActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f7ff',
  },
  viewDocButtonText: {
    color: '#007AFF',
    marginLeft: 5,
    fontSize: 12,
  },
  comparisonValue: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  comparisonPercent: {
    fontWeight: '600',
    fontSize: 14,
    minWidth: 50,
    textAlign: 'right',
  },
  comparisonStatus: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  comparisonStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  docModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  docModalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  docModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  docModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  docModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  docLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLoadingText: {
    marginTop: 16,
    color: '#666',
  },
  docContentContainer: {
    padding: 16,
  },
  docContentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    paddingBottom: 20,
  },
});

export default HistoryPage;