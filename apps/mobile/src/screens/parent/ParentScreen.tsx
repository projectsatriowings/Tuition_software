import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ReceiptModal } from '../../components/ReceiptModal';

export const ParentScreen: React.FC = () => {
  const { user } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<'children' | 'academics' | 'fees' | 'messages' | 'reviews'>('children');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Parent Data
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childStatement, setChildStatement] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // New Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const fetchParentData = useCallback(async () => {
    try {
      // 1. Fetch Verified Linked Children
      const kidsRes = await mobileApiFetch('/parents/my/children');
      const rawList = Array.isArray(kidsRes.data)
        ? kidsRes.data
        : (Array.isArray(kidsRes.data?.children)
            ? kidsRes.data.children.map((c: any) => ({
                ...(c.student || {}),
                relationship: c.relationship,
                isPrimaryContact: c.isPrimaryContact,
                canReceiveSms: c.canReceiveSms,
              }))
            : []);
      if (kidsRes.success && rawList.length > 0) {
        setChildren(rawList);
        if (!selectedChild) {
          const firstKid = rawList[0];
          setSelectedChild(firstKid);
          loadChildDetails(firstKid.id);
        } else {
          loadChildDetails(selectedChild.id);
        }
      } else if (kidsRes.success) {
        setChildren([]);
      }

      // 2. Fetch Conversations
      const convRes = await mobileApiFetch('/messaging/conversations');
      if (convRes.success && convRes.data) {
        setConversations(Array.isArray(convRes.data) ? convRes.data : convRes.data.conversations || []);
      }

      // 3. Fetch Reviews
      const revRes = await mobileApiFetch('/reviews');
      if (revRes.success && revRes.data) {
        setReviews(Array.isArray(revRes.data) ? revRes.data : revRes.data.reviews || []);
      }
    } catch (e) {
      console.warn('Error fetching parent mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  const loadChildDetails = async (childStudentId: string) => {
    try {
      // Fetch Child Fee Statement
      const stmtRes = await mobileApiFetch(`/fees/students/${childStudentId}/statement`);
      if (stmtRes.success) {
        setChildStatement(stmtRes.data);
      }

      // Fetch Materials & Homework
      const matRes = await mobileApiFetch('/materials');
      if (matRes.success && matRes.data) {
        setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.materials || []);
      }

      const hwRes = await mobileApiFetch('/homework');
      if (hwRes.success && hwRes.data) {
        setHomeworkList(Array.isArray(hwRes.data) ? hwRes.data : hwRes.data.homework || []);
      }
    } catch (e) {
      console.warn('Error loading child details:', e);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchParentData();
  };

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    loadChildDetails(child.id);
  };

  const openConversation = async (conv: any) => {
    setActiveConversation(conv);
    try {
      const msgRes = await mobileApiFetch(`/messaging/conversations/${conv.id}/messages`);
      if (msgRes.success && msgRes.data) {
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []);
      }
    } catch {
      Alert.alert('Error', 'Unable to load message thread.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const res = await mobileApiFetch(`/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        body: { content: newMessage.trim() },
      });
      if (res.success) {
        setNewMessage('');
        const msgRes = await mobileApiFetch(`/messaging/conversations/${activeConversation.id}/messages`);
        if (msgRes.success && msgRes.data) {
          setMessages(Array.isArray(msgRes.data) ? msgRes.data : msgRes.data.messages || []);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not send message.');
    }
  };

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const res = await mobileApiFetch(`/fees/payments/${paymentId}/receipt`);
      if (res.success && res.data) {
        const r = res.data.receipt || res.data;
        setSelectedReceipt({
          receiptNumber: r.receiptNumber || `REC-${paymentId.slice(0, 8)}`,
          transactionReference: r.payment?.transactionReference || r.transactionReference,
          studentName: r.student?.fullName || selectedChild?.user?.fullName || 'Child',
          studentRoll: r.student?.rollNumber || selectedChild?.rollNumber,
          batchName: r.student?.batchName || selectedChild?.batch?.name,
          instituteName: r.institute?.name || 'Apex Academy of Science',
          feeTitle: r.feeDetails?.feeName || res.data.feeStructure?.title || 'Fee Payment',
          amount: r.feeDetails?.amountPaid || r.amount || 0,
          paymentMethod: r.payment?.method || r.paymentMethod || 'UPI',
          paidAt: r.receiptDate || r.paidAt || r.createdAt,
        });
        setShowReceiptModal(true);
      }
    } catch {
      Alert.alert('Error', 'Unable to load receipt.');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please write your feedback message.');
      return;
    }

    try {
      const res = await mobileApiFetch('/reviews', {
        method: 'POST',
        body: {
          rating: reviewRating,
          reviewText: reviewComment.trim(),
          studentId: selectedChild?.id,
        },
      });

      if (res.success) {
        Alert.alert('Review Submitted', 'Thank you! Your feedback has been sent to institute management.');
        setShowReviewModal(false);
        setReviewComment('');
        fetchParentData();
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit review.');
      }
    } catch {
      Alert.alert('Error', 'Server connection error.');
    }
  };

  const formatRupee = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <View style={styles.container}>
      <Header
        title="Parent Portal"
        subtitle={selectedChild ? `Student: ${selectedChild.user?.fullName}` : 'Family Dashboard'}
        onRefresh={onRefresh}
      />

      {/* Linked Children Quick Bar */}
      {children.length > 0 && (
        <View style={styles.childrenBar}>
          <Text style={styles.childrenLabel}>LINKED CHILDREN:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childrenChips}>
            {children.map((kid) => {
              const isSelected = selectedChild?.id === kid.id;
              return (
                <TouchableOpacity
                  key={kid.id}
                  onPress={() => handleSelectChild(kid)}
                  style={[styles.childChip, isSelected && styles.childChipActive]}
                >
                  <Text style={[styles.childChipText, isSelected && styles.childChipTextActive]}>
                    👦 {kid.user?.fullName} ({kid.rollNumber})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('children')}
          style={[styles.tabItem, activeTab === 'children' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'children' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('academics')}
          style={[styles.tabItem, activeTab === 'academics' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'academics' && styles.activeTabText]}>
            Academics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('fees')}
          style={[styles.tabItem, activeTab === 'fees' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'fees' && styles.activeTabText]}>
            Fees (₹)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('messages')}
          style={[styles.tabItem, activeTab === 'messages' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('reviews')}
          style={[styles.tabItem, activeTab === 'reviews' && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading parent records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'children' && (
            <View>
              {selectedChild ? (
                <>
                  <Card highlighted>
                    <View style={styles.childHeader}>
                      <View style={styles.childAvatar}>
                        <Text style={styles.childAvatarText}>
                          {selectedChild.user?.fullName?.[0] || 'C'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{selectedChild.user?.fullName}</Text>
                        <Text style={styles.childRoll}>
                          Roll No: {selectedChild.rollNumber} &bull; Batch: {selectedChild.batch?.name || 'Class 12'}
                        </Text>
                        <View style={styles.childBadgeRow}>
                          <Badge label="VERIFIED LINKAGE" variant="success" size="sm" />
                          <Badge label="IN PERSON PASS" variant="info" size="sm" />
                        </View>
                      </View>
                    </View>
                  </Card>

                  {/* Financial Quick Callout */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: '#1e1b4b' }]}>
                      <Text style={styles.statLabel}>FEES OUTSTANDING</Text>
                      <Text style={[styles.statValue, { color: '#f87171' }]}>
                        {formatRupee(childStatement?.summary?.outstandingBalance || 0)}
                      </Text>
                      <Text style={styles.statNote}>Due for {selectedChild.user?.fullName}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#064e3b' }]}>
                      <Text style={styles.statLabel}>TOTAL PAID</Text>
                      <Text style={[styles.statValue, { color: '#34d399' }]}>
                        {formatRupee(childStatement?.summary?.totalPaid || 0)}
                      </Text>
                      <Text style={styles.statNote}>Verified Receipts</Text>
                    </View>
                  </View>

                  {/* Campus Safety & Attendance Status */}
                  <Card style={{ marginTop: 12 }}>
                    <Text style={styles.cardHeaderTitle}>🛡️ Campus Attendance & Safety</Text>
                    <Text style={styles.safetyText}>
                      Biometric & cryptographic QR check-in notifications are dispatched via SMS directly to your registered mobile number upon entry and departure.
                    </Text>
                    <View style={styles.safetyBadgeRow}>
                      <Badge label="SMS OUTBOX ACTIVE" variant="indigo" size="sm" />
                      <Badge label="GATE LOG VALIDATED" variant="success" size="sm" />
                    </View>
                  </Card>
                </>
              ) : (
                <Card>
                  <Text style={styles.emptyText}>No verified linked children found for this account.</Text>
                </Card>
              )}
            </View>
          )}

          {/* TAB 2: ACADEMICS */}
          {activeTab === 'academics' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Study Materials Assigned</Text>
                <Text style={styles.sectionCount}>{materials.length} files</Text>
              </View>

              {materials.length === 0 ? (
                <Card><Text style={styles.emptyText}>No materials found.</Text></Card>
              ) : (
                materials.map((m) => (
                  <Card key={m.id}>
                    <View style={styles.matItemRow}>
                      <Text style={styles.matIcon}>{m.type === 'PDF' ? '📄' : '🎧'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matTitle}>{m.title}</Text>
                        <Text style={styles.matSubject}>{m.subject?.name || 'Class Subject'} &bull; {m.type}</Text>
                      </View>
                      <Badge label="ACCESSIBLE" variant="info" size="sm" />
                    </View>
                  </Card>
                ))
              )}

              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={styles.sectionTitle}>📝 Assigned Homework</Text>
                <Text style={styles.sectionCount}>{homeworkList.length} items</Text>
              </View>

              {homeworkList.length === 0 ? (
                <Card><Text style={styles.emptyText}>No current homework assignments.</Text></Card>
              ) : (
                homeworkList.map((hw) => (
                  <Card key={hw.id}>
                    <Text style={styles.hwTitle}>{hw.title}</Text>
                    <Text style={styles.hwDesc}>{hw.description}</Text>
                    <Text style={styles.hwDue}>
                      Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-IN') : 'Open'}
                    </Text>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 3: FEES (Statement & Receipts) */}
          {activeTab === 'fees' && (
            <View>
              <Card highlighted>
                <Text style={styles.feeHeading}>CHILD FINANCIAL STATEMENT</Text>
                <View style={styles.feeTotals}>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Assigned</Text>
                    <Text style={styles.feeColVal}>{formatRupee(childStatement?.summary?.totalAssigned || 0)}</Text>
                  </View>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Paid</Text>
                    <Text style={[styles.feeColVal, { color: '#34d399' }]}>
                      {formatRupee(childStatement?.summary?.totalPaid || 0)}
                    </Text>
                  </View>
                  <View style={styles.feeCol}>
                    <Text style={styles.feeColLabel}>Balance</Text>
                    <Text style={[styles.feeColVal, { color: '#f87171' }]}>
                      {formatRupee(childStatement?.summary?.outstandingBalance || 0)}
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🧾 Payment Receipts</Text>
              </View>

              {childStatement?.payments?.length === 0 ? (
                <Card><Text style={styles.emptyText}>No payments recorded yet.</Text></Card>
              ) : (
                childStatement?.payments?.map((pm: any) => (
                  <Card key={pm.id} onPress={() => handleOpenReceipt(pm.id)}>
                    <View style={styles.paymentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentAmt}>{formatRupee(pm.amount)}</Text>
                        <Text style={styles.paymentMethod}>
                          {pm.paymentMethod} &bull; {new Date(pm.paidAt || pm.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                        {pm.receiptNumber && (
                          <Text style={styles.receiptNo}>Receipt #{pm.receiptNumber}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleOpenReceipt(pm.id)}
                        style={styles.openReceiptBtn}
                      >
                        <Text style={styles.openReceiptBtnText}>View Receipt 📄</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 4: MESSAGES (Staff-Parent Messaging) */}
          {activeTab === 'messages' && (
            <View>
              {activeConversation ? (
                <View>
                  <TouchableOpacity
                    onPress={() => setActiveConversation(null)}
                    style={styles.backToConvsBtn}
                  >
                    <Text style={styles.backToConvsText}>← Back to all conversations</Text>
                  </TouchableOpacity>

                  <Card>
                    <Text style={styles.convHeaderTitle}>
                      {activeConversation.title || 'Faculty Conversation'}
                    </Text>
                  </Card>

                  {/* Message Thread */}
                  <View style={styles.messagesContainer}>
                    {messages.length === 0 ? (
                      <Card><Text style={styles.emptyText}>No messages in this conversation.</Text></Card>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.senderId === user?.id;
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.messageBubble,
                              isMine ? styles.msgMine : styles.msgOther,
                            ]}
                          >
                            <Text style={styles.msgSender}>
                              {isMine ? 'You' : m.sender?.fullName || 'Teacher'}
                            </Text>
                            <Text style={styles.msgBody}>{m.content}</Text>
                            <Text style={styles.msgTime}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Send Input */}
                  <View style={styles.sendBar}>
                    <TextInput
                      style={styles.msgInput}
                      placeholder="Type a message to teacher..."
                      placeholderTextColor="#64748b"
                      value={newMessage}
                      onChangeText={setNewMessage}
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                      <Text style={styles.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>💬 Teacher Conversations</Text>
                  </View>

                  {conversations.length === 0 ? (
                    <Card><Text style={styles.emptyText}>No messages from staff yet.</Text></Card>
                  ) : (
                    conversations.map((c) => (
                      <Card key={c.id} onPress={() => openConversation(c)}>
                        <View style={styles.convItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.convTitle}>{c.title || 'Teacher Communication'}</Text>
                            <Text style={styles.convSub}>Tap to view and reply</Text>
                          </View>
                          <Badge label="OPEN" variant="info" size="sm" />
                        </View>
                      </Card>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* TAB 5: REVIEWS */}
          {activeTab === 'reviews' && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⭐ Institute Reviews & Feedback</Text>
                <TouchableOpacity
                  onPress={() => setShowReviewModal(true)}
                  style={styles.addReviewBtn}
                >
                  <Text style={styles.addReviewBtnText}>+ Write Review</Text>
                </TouchableOpacity>
              </View>

              {reviews.length === 0 ? (
                <Card><Text style={styles.emptyText}>No parent reviews submitted yet.</Text></Card>
              ) : (
                reviews.map((rev) => (
                  <Card key={rev.id}>
                    <View style={styles.revHeader}>
                      <Text style={styles.revRating}>{'★'.repeat(rev.rating || 5)}</Text>
                      <Text style={styles.revDate}>
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    <Text style={styles.revComment}>{rev.comment}</Text>
                    {rev.response && (
                      <View style={styles.revResponseBox}>
                        <Text style={styles.revResponseTitle}>Institute Reply:</Text>
                        <Text style={styles.revResponseText}>{rev.response}</Text>
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Institute Feedback</Text>
            <Text style={styles.modalSub}>Share your review with management</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.starBtn, reviewRating >= star && styles.starActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Write your feedback regarding classes, staff, or facilities..."
              placeholderTextColor="#64748b"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitReview}
                style={styles.modalSubmitBtn}
              >
                <Text style={styles.modalSubmitBtnText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  childrenBar: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  childrenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  childrenChips: {
    gap: 8,
  },
  childChip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  childChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#6366f1',
  },
  childChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  childChipTextActive: {
    color: '#a5b4fc',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#818cf8',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  childAvatarText: {
    color: '#818cf8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  childName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  childRoll: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  childBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4,
  },
  statNote: {
    fontSize: 10,
    color: '#94a3b8',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  safetyText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 10,
  },
  safetyBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionCount: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  matItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matIcon: {
    fontSize: 20,
  },
  matTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  matSubject: {
    color: '#818cf8',
    fontSize: 11,
    marginTop: 2,
  },
  hwTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  hwDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  hwDue: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 8,
  },
  feeHeading: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  feeTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeCol: {
    alignItems: 'center',
  },
  feeColLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  feeColVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmt: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  paymentMethod: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  receiptNo: {
    color: '#818cf8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  openReceiptBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  openReceiptBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backToConvsBtn: {
    marginBottom: 12,
  },
  backToConvsText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  convHeaderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  messagesContainer: {
    gap: 8,
    marginVertical: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  msgMine: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  msgOther: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  msgSender: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  msgBody: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    color: '#94a3b8',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  sendBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  msgInput: {
    flex: 1,
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  convItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  convSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  addReviewBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addReviewBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  revRating: {
    color: '#fbbf24',
    fontSize: 14,
    letterSpacing: 2,
  },
  revDate: {
    color: '#64748b',
    fontSize: 11,
  },
  revComment: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  revResponseBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#090d16',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  revResponseTitle: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  revResponseText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starBtn: {
    fontSize: 28,
    color: '#334155',
  },
  starActive: {
    color: '#fbbf24',
  },
  modalInput: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    textAlignVertical: 'top',
    height: 100,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
