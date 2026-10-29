import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch } from '../services/api';
import { MobileButton } from './ui';
import { Badge } from './Badge';

export interface StaffReviewReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const StaffReviewReplyModal: React.FC<StaffReviewReplyModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await mobileApiFetch('/reviews');
      if (res.success && res.data) {
        setReviews(Array.isArray(res.data) ? res.data : res.data.reviews || []);
      }
    } catch (e: any) {
      console.warn('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReviews();
      setSelectedReview(null);
      setReplyText('');
    }
  }, [isOpen]);

  const handleSendReply = async () => {
    if (!selectedReview?.id || !replyText.trim()) {
      Alert.alert('Required', 'Please enter a reply message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await mobileApiFetch(`/reviews/${selectedReview.id}/reply`, {
        method: 'PATCH',
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (res.success) {
        Alert.alert('Success', 'Faculty response submitted successfully.');
        setSelectedReview(null);
        setReplyText('');
        loadReviews();
        onUpdated?.();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit response.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send response.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Parent Reviews & Feedback</Text>
            <Text style={styles.headerSubtitle}>View feedback and provide official faculty responses</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeTokens.colors.primary} />
            <Text style={styles.loadingText}>Loading parent feedback...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {reviews.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                <Text style={styles.emptySub}>Parent feedback and testimonials will appear here.</Text>
              </View>
            ) : (
              reviews.map((rev) => {
                const isSelected = selectedReview?.id === rev.id;
                const hasReply = !!rev.reply;

                return (
                  <View key={rev.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.stars}>{'★'.repeat(rev.rating || 5)}</Text>
                        <Badge
                          label={hasReply ? 'REPLIED' : 'PENDING RESPONSE'}
                          variant={hasReply ? 'success' : 'warning'}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.dateText}>
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>

                    {rev.parent && (
                      <Text style={styles.parentName}>From: {rev.parent.fullName || 'Parent'}</Text>
                    )}

                    <Text style={styles.commentText}>{rev.comment}</Text>

                    {hasReply && (
                      <View style={styles.replyBubble}>
                        <Text style={styles.replyHeader}>Official Response:</Text>
                        <Text style={styles.replyContent}>{rev.reply}</Text>
                      </View>
                    )}

                    {!hasReply && !isSelected && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedReview(rev);
                          setReplyText('');
                        }}
                        style={styles.replyTriggerBtn}
                      >
                        <Text style={styles.replyTriggerText}>💬 Write Faculty Reply</Text>
                      </TouchableOpacity>
                    )}

                    {isSelected && (
                      <View style={styles.replyInputBox}>
                        <Text style={styles.replyInputLabel}>Your Faculty Response:</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Type response to parent..."
                          placeholderTextColor={themeTokens.colors.textSubtle}
                          multiline
                          numberOfLines={3}
                          value={replyText}
                          onChangeText={setReplyText}
                        />
                        <View style={styles.replyActions}>
                          <MobileButton
                            title="Cancel"
                            onPress={() => setSelectedReview(null)}
                            variant="secondary"
                            size="sm"
                            style={{ flex: 1 }}
                          />
                          <MobileButton
                            title="Send Reply"
                            onPress={handleSendReply}
                            variant="primary"
                            size="sm"
                            loading={submitting}
                            style={{ flex: 1 }}
                          />
                        </View>
                      </View>
                    )}
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
  container: {
    padding: 16,
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
  card: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    marginBottom: 12,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stars: {
    fontSize: 14,
    color: '#F59E0B',
  },
  dateText: {
    fontSize: 11,
    color: themeTokens.colors.textMuted,
  },
  parentName: {
    fontSize: 12,
    fontWeight: '700',
    color: themeTokens.colors.textPrimary,
    marginBottom: 4,
  },
  commentText: {
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
  replyBubble: {
    marginTop: 10,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderRadius: themeTokens.radii.md,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: themeTokens.colors.primary,
  },
  replyHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: themeTokens.colors.primary,
    textTransform: 'uppercase',
  },
  replyContent: {
    fontSize: 12,
    color: themeTokens.colors.textPrimary,
    marginTop: 2,
  },
  replyTriggerBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: themeTokens.radii.md,
    backgroundColor: themeTokens.colors.background,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
  },
  replyTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeTokens.colors.primary,
  },
  replyInputBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.borderSubtle,
  },
  replyInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: themeTokens.colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    borderRadius: themeTokens.radii.md,
    padding: 10,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 64,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
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
    marginTop: 4,
  },
});
