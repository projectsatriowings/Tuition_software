import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { StudentAvatar } from '../../../components/StudentAvatar';
import { PressableScale } from '../../../theme/motion';

interface AdminStaffTabProps {
  staffList: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenStaffModal: () => void;
  onToggleStatus: (member: any) => void;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({
  staffList,
  loading,
  refreshing,
  onRefresh,
  onOpenStaffModal,
  onToggleStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = staffList.filter((member) => {
    const user = member.user || member;
    const name = (user.fullName || '').toLowerCase();
    const code = (member.employeeCode || member.profile?.employeeCode || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    return !query || name.includes(query) || code.includes(query) || email.includes(query);
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.titleText}>Faculty & Staff Directory</Text>
            <Text style={styles.subText}>
              {staffList.length} registered academic instructors
            </Text>
          </View>
          <PressableScale style={styles.addBtn} onPress={onOpenStaffModal} activeScale={0.96}>
            <Text style={styles.addBtnText}>+ Add Faculty</Text>
          </PressableScale>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search faculty by name, employee code..."
            placeholderTextColor="#8D6E63"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Staff List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4E342E"
          />
        }
      >
        {filteredStaff.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👨‍🏫</Text>
            <Text style={styles.emptyTitle}>No Faculty Members Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No faculty match "${searchQuery}".`
                : 'No instructors registered yet. Click "+ Add Faculty" to recruit staff.'}
            </Text>
          </View>
        ) : (
          filteredStaff.map((member) => {
            const staffUser = member.user || member;
            const profile = member.profile || {};
            const code = member.employeeCode || profile.employeeCode || 'STF-STAFF';
            const assignedBatches = member.assignedBatches || member.batches || [];
            const isActive = member.status === 'ACTIVE' || member.isActive !== false;

            return (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.cardMainRow}>
                  <StudentAvatar
                    name={staffUser.fullName || 'Faculty Member'}
                    size={42}
                  />

                  <View style={styles.staffInfo}>
                    <View style={styles.nameCodeRow}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {staffUser.fullName}
                      </Text>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{code}</Text>
                      </View>
                    </View>

                    <Text style={styles.staffContact}>
                      📧 {staffUser.email || 'N/A'}{' '}
                      {staffUser.phone ? `• 📞 ${staffUser.phone}` : ''}
                    </Text>

                    {assignedBatches.length > 0 && (
                      <View style={styles.batchesBadgeRow}>
                        <Text style={styles.batchesLabel}>Classes: </Text>
                        <Text style={styles.batchesText} numberOfLines={1}>
                          {assignedBatches
                            .map((b: any) => b.batch?.name || b.name || 'Batch')
                            .join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Footer with Status Toggle */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusPill,
                      isActive ? styles.pillActive : styles.pillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isActive ? styles.textActive : styles.textInactive,
                      ]}
                    >
                      {isActive ? 'ACTIVE FACULTY' : 'INACTIVE'}
                    </Text>
                  </View>

                  <PressableScale style={[styles.toggleBtn, isActive ? styles.toggleBtnDeact : styles.toggleBtnReact]} onPress={() => onToggleStatus(member)} activeScale={0.96}>
                    <Text
                      style={[
                        styles.toggleBtnText,
                        isActive ? styles.toggleTextDeact : styles.toggleTextReact,
                      ]}
                    >
                      {isActive ? 'Deactivate' : 'Reactivate'}
                    </Text>
                  </PressableScale>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2D1E18',
  },
  subText: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2D1E18',
    paddingVertical: 2,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#8D6E63',
    paddingHorizontal: 6,
  },

  // Staff Cards
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    shadowColor: '#2D1E18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  staffInfo: {
    flex: 1,
  },
  nameCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  codeBadge: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  codeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4E342E',
  },
  staffContact: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  batchesBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  batchesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D6E63',
  },
  batchesText: {
    fontSize: 10,
    color: '#4E342E',
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillActive: {
    backgroundColor: '#ECFDF5',
  },
  pillInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textActive: {
    color: '#059669',
  },
  textInactive: {
    color: '#6B7280',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnDeact: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  toggleBtnReact: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  toggleTextDeact: {
    color: '#DC2626',
  },
  toggleTextReact: {
    color: '#059669',
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
  },
  emptySub: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 4,
  },
});

