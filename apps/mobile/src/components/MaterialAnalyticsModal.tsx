import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch } from '../services/api';
import { MobileButton } from './ui';
import { Badge } from './Badge';
import { StudentAvatar } from './StudentAvatar';

export interface MaterialAnalyticsModalProps {
  material: any;
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialAnalyticsModal: React.FC<MaterialAnalyticsModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && material?.id) {
      setLoading(true);
      mobileApiFetch(`/materials/${material.id}/interactions`)
        .then((res) => {
          if (res.success && res.data) {
            setInteractions(res.data.interactions || []);
          }
        })
        .catch((err) => {
          console.warn('Failed to load interactions:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, material?.id]);

  if (!isOpen) return null;

  // Deduplicate unique student viewers
  const uniqueStudentsMap = new Map<string, any>();
  let audioCompletedCount = 0;

  interactions.forEach((item) => {
    if (item.student?.id && !uniqueStudentsMap.has(item.student.id)) {
      uniqueStudentsMap.set(item.student.id, {
        student: item.student,
        firstOpenedAt: item.firstOpenedAt || item.createdAt,
        lastOpenedAt: item.lastOpenedAt || item.updatedAt,
        progressPercent: item.progressPercent || 0,
        eventType: item.eventType,
      });
    }
    if (item.eventType === 'AUDIO_COMPLETED' || item.progressPercent >= 95) {
      audioCompletedCount++;
    }
  });

  const uniqueViewers = Array.from(uniqueStudentsMap.values());
  const isAudioMaterial = material?.type === 'AUDIO' || material?.type === 'VOICE_NOTE';

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {material?.title || 'Engagement Analytics'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {material?.batch?.name || 'Class Batch'} • {material?.type || 'MATERIAL'}
            </Text>
          </View>
        </View>

        {/* Metrics Overview */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Views</Text>
            <Text style={styles.metricVal}>{interactions.length}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Unique Students</Text>
            <Text style={styles.metricVal}>{uniqueViewers.length}</Text>
          </View>
          {isAudioMaterial && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Completed Audio</Text>
                <Text style={[styles.metricVal, { color: themeTokens.colors.success }]}>
                  {audioCompletedCount}
                </Text>
              </View>
            </>
          )}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeTokens.colors.primary} />
            <Text style={styles.loadingText}>Fetching interaction analytics...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.sectionTitle}>Students Who Viewed This Resource</Text>

            {uniqueViewers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Viewers Recorded Yet</Text>
                <Text style={styles.emptySub}>
                  When students open this published material on the web or mobile app, engagement telemetry will appear here in real time.
                </Text>
              </View>
            ) : (
              uniqueViewers.map((viewer, idx) => {
                const sName = `${viewer.student?.firstName || ''} ${viewer.student?.lastName || ''}`.trim() || 'Student';
                const adm = viewer.student?.admissionNumber || 'ADM-N/A';

                return (
                  <View key={viewer.student?.id || idx} style={styles.viewerCard}>
                    <View style={styles.viewerRow}>
                      <StudentAvatar name={sName} size={40} />
                      <View style={styles.viewerDetails}>
                        <Text style={styles.viewerName}>{sName}</Text>
                        <Text style={styles.viewerMeta}>
                          Admission: {adm} • First opened:{' '}
                          {new Date(viewer.firstOpenedAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <Badge
                        label={
                          isAudioMaterial && viewer.progressPercent >= 95
                            ? 'LISTENED 100%'
                            : 'VIEWED'
                        }
                        variant={isAudioMaterial && viewer.progressPercent >= 95 ? 'success' : 'info'}
                        size="sm"
                      />
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  header: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.cocoa,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closeBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: themeTokens.typography.weights.bold,
    color: themeTokens.colors.textLight,
  },
  headerSubtitle: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textLightMuted,
    marginTop: 2,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: themeTokens.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: themeTokens.colors.border,
  },
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '800',
    color: themeTokens.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewerCard: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 10,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  viewerName: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
  },
  viewerMeta: {
    fontSize: 11,
    color: themeTokens.colors.textMuted,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});

