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

interface AdminStudentsTabProps {
  students: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenAdmitModal: () => void;
  onSelectStudent: (studentId: string) => void;
  onStatusConfirm: (student: any, newStatus: string) => void;
}

export const AdminStudentsTab: React.FC<AdminStudentsTabProps> = ({
  students,
  loading,
  refreshing,
  onRefresh,
  onOpenAdmitModal,
  onSelectStudent,
  onStatusConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSED_OUT' | 'DISCONTINUED'>('ALL');

  const filteredStudents = students.filter((st) => {
    const fullName = (st.user?.fullName || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
    const admNo = (st.admissionNumber || '').toLowerCase();
    const rollNo = (st.rollNumber || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      admNo.includes(query) ||
      rollNo.includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const stStatus = st.status || 'ACTIVE';
    return stStatus === statusFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.titleText}>Student Directory</Text>
            <Text style={styles.subText}>
              {students.length} total registered students
            </Text>
          </View>
          <TouchableOpacity
            style={styles.admitBtn}
            onPress={onOpenAdmitModal}
            activeOpacity={0.8}
          >
            <Text style={styles.admitBtnText}>+ Admit Student</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name, roll, admission no..."
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

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {(['ALL', 'ACTIVE', 'PASSED_OUT', 'DISCONTINUED'] as const).map((filter) => {
            const isSel = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setStatusFilter(filter)}
                style={[styles.filterChip, isSel && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSel && styles.filterChipTextActive,
                  ]}
                >
                  {filter === 'ALL'
                    ? `ALL (${students.length})`
                    : filter.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Student List */}
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
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👨‍🎓</Text>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No students match "${searchQuery}" in this filter.`
                : 'No students enrolled under this filter category.'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((st) => {
            const fullName =
              st.user?.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Student';
            const adm = st.admissionNumber || st.rollNumber || '—';
            const batchName =
              st.enrollments?.[0]?.batch?.name || st.batch?.name || 'Unassigned';
            const status = st.status || 'ACTIVE';

            return (
              <View key={st.id} style={styles.studentCard}>
                <TouchableOpacity
                  style={styles.cardMainRow}
                  onPress={() => onSelectStudent(st.id)}
                  activeOpacity={0.7}
                >
                  <StudentAvatar
                    studentId={st.id}
                    photoUrl={st.photoUrl}
                    name={fullName}
                    size={42}
                  />

                  <View style={styles.studentInfo}>
                    <View style={styles.nameStatusRow}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {fullName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          status === 'ACTIVE'
                            ? styles.badgeGreen
                            : status === 'PASSED_OUT'
                            ? styles.badgeBlue
                            : styles.badgeGray,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            status === 'ACTIVE'
                              ? styles.badgeGreenText
                              : status === 'PASSED_OUT'
                              ? styles.badgeBlueText
                              : styles.badgeGrayText,
                          ]}
                        >
                          {status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.studentMeta}>
                      Adm: {adm} &bull; Class: {batchName}
                    </Text>

                    {st.user?.phone && (
                      <Text style={styles.studentContact}>
                        📞 {st.user.phone}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Bottom Actions Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => onSelectStudent(st.id)}
                  >
                    <Text style={styles.detailsBtnText}>View Full Profile ➔</Text>
                  </TouchableOpacity>

                  <View style={styles.lifecycleBtnRow}>
                    {status === 'ACTIVE' ? (
                      <>
                        <TouchableOpacity
                          style={styles.passBtn}
                          onPress={() => onStatusConfirm(st, 'PASSED_OUT')}
                        >
                          <Text style={styles.passBtnText}>Mark Passed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.discBtn}
                          onPress={() => onStatusConfirm(st, 'DISCONTINUED')}
                        >
                          <Text style={styles.discBtnText}>Discontinue</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.reactivateBtn}
                        onPress={() => onStatusConfirm(st, 'ACTIVE')}
                      >
                        <Text style={styles.reactivateBtnText}>Reactivate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
  admitBtn: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  admitBtnText: {
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
    marginBottom: 10,
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
  filterChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#FAF7F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  filterChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Student Cards
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  studentCard: {
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
  studentInfo: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D1E18',
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGreenText: {
    color: '#059669',
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeBlueText: {
    color: '#2563EB',
  },
  badgeGray: {
    backgroundColor: '#F3F4F6',
  },
  badgeGrayText: {
    color: '#6B7280',
  },
  studentMeta: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  studentContact: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5ECE8',
  },
  detailsBtn: {
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4E342E',
  },
  lifecycleBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  passBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  passBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  discBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  discBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  reactivateBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reactivateBtnText: {
    fontSize: 10,
    fontWeight: '700',
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

