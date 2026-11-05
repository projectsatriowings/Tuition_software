import React, { useEffect, useState } from 'react';
import {
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
import { Headphones, FileText } from 'lucide-react-native';
import { mobileApiFetch, buildAuthenticatedDownloadUrl } from '../services/api';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';

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
    <InteractiveBottomSheet
      visible={visible}
      onClose={onClose}
      title={material.title}
      subtitle={`${material.subject?.name || 'Curriculum'} • ${material.batch?.name || 'Class'}`}
      maxHeight="90%"
    >
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
            {loadingFile ? (
              <ActivityIndicator
                size="large"
                color={themeTokens.colors.primary[800]}
                style={{ marginVertical: 32 }}
              />
            ) : null}
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
            <Headphones size={38} color="#4E342E" style={{ marginBottom: 8 }} />
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
            <FileText size={38} color="#4E342E" style={{ marginBottom: 8 }} />
            <Text style={styles.fileName}>{material.fileName || 'Educational Document'}</Text>
            <Text style={styles.fileSub}>
              {material.type} file &bull; Authenticated Access
            </Text>

            <TouchableOpacity onPress={handleOpenExternal} style={styles.openFileBtn}>
              <Text style={styles.openFileBtnText}>Open in System PDF Viewer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleOpenExternal} style={styles.secondaryOpenBtn}>
              <Text style={styles.secondaryOpenBtnText}>Download to Device</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Text / Rich Content Viewer */}
        {isText && material.content ? (
          <View style={styles.textBox}>
            <Text style={styles.textContent}>{material.content}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        {downloadUrl ? (
          <TouchableOpacity onPress={handleOpenExternal} style={styles.downloadLink}>
            <Text style={styles.downloadLinkText}>Direct Download Link</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
          <Text style={styles.closeFooterBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </InteractiveBottomSheet>
  );
};

const styles = StyleSheet.create({
  bodyScroll: {
    padding: 18,
    paddingBottom: 24,
  },
  descBox: {
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  descTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: '#4E342E',
    lineHeight: 18,
  },
  imageContainer: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#F5ECE8',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  errorBox: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#8D6E63',
    fontSize: 13,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  audioBox: {
    backgroundColor: '#FAF7F2',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  audioIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  audioTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D1E18',
    marginBottom: 4,
  },
  audioSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginBottom: 16,
    textAlign: 'center',
  },
  playBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  playBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  completeAudioBtn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  completeAudioBtnText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fileBox: {
    backgroundColor: '#FAF7F2',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  fileIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1E18',
    marginBottom: 4,
    textAlign: 'center',
  },
  fileSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginBottom: 16,
  },
  openFileBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  openFileBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  secondaryOpenBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7CCC8',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryOpenBtnText: {
    color: '#5D4037',
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
