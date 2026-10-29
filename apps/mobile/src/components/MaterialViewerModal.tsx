import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch, buildAuthenticatedDownloadUrl } from '../services/api';

export interface MaterialViewerModalProps {
  visible: boolean;
  material: any | null;
  onClose: () => void;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({
  visible,
  material,
  onClose,
}) => {
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (visible && material?.id) {
      // 1. Resolve authenticated download URL
      if (material.fileUrl) {
        buildAuthenticatedDownloadUrl(`/materials/${material.id}/download`).then((url) => {
          setDownloadUrl(url);
        });
      }

      // 2. Track material OPEN event separately from audio completion
      mobileApiFetch(`/materials/${material.id}/track`, {
        method: 'POST',
        body: { eventType: 'OPENED' },
      }).catch(() => {});
    }
  }, [visible, material?.id]);

  if (!material) return null;

  const isAudio = material.type === 'AUDIO' || material.type === 'VOICE_NOTE';
  const isImage = material.type === 'IMAGE' || (material.mimeType && material.mimeType.startsWith('image/'));
  const isPdf = material.type === 'PDF' || (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
  const isText = material.type === 'TEXT' || (!material.fileUrl && !!material.content);

  const handleOpenExternal = async () => {
    if (!downloadUrl) return;
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Notice', `Open link in browser: ${downloadUrl}`);
      }
    } catch {
      Alert.alert('Error', 'Unable to open file in system viewer.');
    }
  };

  const handleMarkAudioCompleted = async () => {
    try {
      await mobileApiFetch(`/materials/${material.id}/track`, {
        method: 'POST',
        body: { eventType: 'AUDIO_COMPLETED', progressPercent: 100 },
      });
      Alert.alert('Completed', 'Lecture listening marked as completed.');
    } catch {
      Alert.alert('Error', 'Failed to update progress.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {material.title}
              </Text>
              <Text style={styles.subTitle}>
                {material.subject?.name || 'Curriculum'} &bull; {material.batch?.name || 'Class'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.bodyScroll} bounces={false}>
            {material.description ? (
              <View style={styles.descBox}>
                <Text style={styles.descTitle}>STUDY INSTRUCTIONS</Text>
                <Text style={styles.descText}>{material.description}</Text>
              </View>
            ) : null}

            {/* Image Viewer */}
            {isImage && downloadUrl ? (
              <View style={styles.imageContainer}>
                {loadingFile && <ActivityIndicator color={themeTokens.colors.primary[700]} />}
                {!imgError ? (
                  <Image
                    source={{ uri: downloadUrl }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                    onLoadStart={() => setLoadingFile(true)}
                    onLoadEnd={() => setLoadingFile(false)}
                    onError={() => {
                      setLoadingFile(false);
                      setImgError(true);
                    }}
                  />
                ) : (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>Unable to load image preview.</Text>
                    <TouchableOpacity onPress={handleOpenExternal} style={styles.actionBtn}>
                      <Text style={styles.actionBtnText}>Open in Device Browser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}

            {/* Audio Viewer */}
            {isAudio ? (
              <View style={styles.audioBox}>
                <Text style={styles.audioIcon}>🎧</Text>
                <Text style={styles.audioTitle}>Audio Lecture / Voice Note</Text>
                <Text style={styles.audioSub}>
                  {material.fileName || 'Audio study resource'}
                </Text>
                <TouchableOpacity onPress={handleOpenExternal} style={styles.playBtn}>
                  <Text style={styles.playBtnText}>▶ Play in Audio Player</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMarkAudioCompleted}
                  style={styles.completeAudioBtn}
                >
                  <Text style={styles.completeAudioBtnText}>✓ Mark Listening Completed</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* PDF & Document Viewer */}
            {isPdf || (!isImage && !isAudio && !isText && material.fileUrl) ? (
              <View style={styles.fileBox}>
                <Text style={styles.fileIcon}>📄</Text>
                <Text style={styles.fileName}>{material.fileName || 'Educational Document'}</Text>
                <Text style={styles.fileSub}>
                  {material.type} file &bull; Authenticated Access
                </Text>

                <TouchableOpacity onPress={handleOpenExternal} style={styles.openFileBtn}>
                  <Text style={styles.openFileBtnText}>Open in System PDF Viewer</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Text Study Notes Viewer */}
            {material.content ? (
              <View style={styles.textBox}>
                <Text style={styles.textContent}>{material.content}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerRow}>
            {downloadUrl ? (
              <TouchableOpacity onPress={handleOpenExternal} style={styles.downloadLink}>
                <Text style={styles.downloadLinkText}>⬇ Download / Open File</Text>
              </TouchableOpacity>
            ) : <View />}

            <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    backgroundColor: '#F7F2EF',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1E18',
  },
  subTitle: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#8D6E63',
    fontWeight: 'bold',
  },
  bodyScroll: {
    padding: 18,
  },
  descBox: {
    backgroundColor: '#F7F2EF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    marginBottom: 14,
  },
  descTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  descText: {
    fontSize: 12,
    color: '#4E342E',
    fontStyle: 'italic',
  },
  imageContainer: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECE6E1',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  errorBox: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#B71C1C',
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  audioBox: {
    padding: 24,
    backgroundColor: '#F7F2EF',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  audioIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  audioTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  audioSub: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
    marginBottom: 16,
  },
  playBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  completeAudioBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#81C784',
    backgroundColor: '#E8F5E9',
  },
  completeAudioBtnText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fileBox: {
    padding: 24,
    backgroundColor: '#F7F2EF',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  fileIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1E18',
    textAlign: 'center',
  },
  fileSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
    marginBottom: 16,
  },
  openFileBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openFileBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
    marginTop: 10,
  },
  textContent: {
    fontSize: 13,
    color: '#2D1E18',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
    backgroundColor: '#FAFAFA',
  },
  downloadLink: {
    paddingVertical: 6,
  },
  downloadLinkText: {
    color: '#4E342E',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  closeFooterBtn: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeFooterBtnText: {
    color: '#4E342E',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
