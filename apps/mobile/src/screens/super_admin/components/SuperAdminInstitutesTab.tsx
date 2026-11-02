import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { mobileApiFetch } from '../../../services/api';
import { PressableScale } from '../../../theme/motion';

interface SuperAdminInstitutesTabProps {
  institutes: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onSelectInstitute: (inst: any) => void;
}

export const SuperAdminInstitutesTab: React.FC<SuperAdminInstitutesTabProps> = ({
  institutes,
  loading,
  refreshing,
  onRefresh,
  onOpenCreateModal,
  onSelectInstitute,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredInstitutes = institutes.filter((inst) => {
    const name = (inst.name || '').toLowerCase();
    const code = (inst.code || '').toLowerCase();
    const email = (inst.email || '').toLowerCase();
    const phone = (inst.phone || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      code.includes(query) ||
      email.includes(query) ||
      phone.includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const instStatus = inst.status || 'ACTIVE';
    return instStatus === statusFilter;
  });

  const activeCount = institutes.filter((i) => (i.status || 'ACTIVE') === 'ACTIVE').length;
  const suspendedCount = institutes.filter((i) => i.status === 'SUSPENDED').length;
  const pendingCount = institutes.filter((i) => i.status === 'PENDING_SETUP').length;

  const handleToggleStatus = (inst: any) => {
    const isCurrentlyActive = (inst.status || 'ACTIVE') === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'Suspend' : 'Activate';

    Alert.alert(
      `${actionLabel} Institute`,
      `Are you sure you want to change status of "${inst.name}" to ${nextStatus}? ${
        isCurrentlyActive
          ? 'Tenant users will temporarily lose platform access.'
          : 'Tenant users will immediately regain full platform access.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: isCurrentlyActive ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingId(inst.id);
            try {
              const res = await mobileApiFetch(`/institutes/${inst.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: nextStatus }),
              });
              if (res.success) {
                Alert.alert('Status Updated', `Institute status set to ${nextStatus}.`);
                onRefresh();
              } else {
                Alert.alert('Update Failed', res.error || 'Failed to modify status.');
              }
            } catch (err: any) {
              Alert.alert('Network Error', err.message || 'Unable to update status.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#E8F5E9', text: '#2E7D32', label: 'ACTIVE' };
      case 'SUSPENDED':
        return { bg: '#FFEBEE', text: '#C62828', label: 'SUSPENDED' };
      case 'PENDING_SETUP':
        return { bg: '#FFF8E1', text: '#F57F17', label: 'PENDING' };
      default:
        return { bg: '#F5F5F5', text: '#616161', label: status || 'ACTIVE' };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.titleText}>Institute Directory</Text>
            <Text style={styles.subText}>
              {institutes.length} total registered multi-tenant entities
            </Text>
          </View>
          <PressableScale
            style={styles.provisionBtn}
            onPress={onOpenCreateModal}
            activeScale={0.96}
            accessibilityRole="button"
            accessibilityLabel="Provision new institute"
          >
            <Text style={styles.provisionBtnText}>+ Provision</Text>
          </PressableScale>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, or email..."
            placeholderTextColor="#8D6E63"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              statusFilter === 'ALL' && styles.filterPillActive,
            ]}
            onPress={() => setStatusFilter('ALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === 'ALL' && styles.filterPillTextActive,
              ]}
            >
              All ({institutes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              statusFilter === 'ACTIVE' && styles.filterPillActive,
            ]}
            onPress={() => setStatusFilter('ACTIVE')}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
            <Text
              style={[
                styles.filterPillText,
                statusFilter === 'ACTIVE' && styles.filterPillTextActive,
              ]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              statusFilter === 'SUSPENDED' && styles.filterPillActive,
            ]}
            onPress={() => setStatusFilter('SUSPENDED')}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: '#C62828' }]} />
            <Text
              style={[
                styles.filterPillText,
                statusFilter === 'SUSPENDED' && styles.filterPillTextActive,
              ]}
            >
              Suspended ({suspendedCount})
            </Text>
          </TouchableOpacity>

          {pendingCount > 0 && (
            <TouchableOpacity
              style={[
                styles.filterPill,
                statusFilter === 'PENDING_SETUP' && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter('PENDING_SETUP')}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: '#F57F17' }]} />
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === 'PENDING_SETUP' && styles.filterPillTextActive,
                ]}
              >
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main List Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4E342E" />
          <Text style={styles.loadingText}>Loading institute directory...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4E342E"
              colors={['#4E342E']}
            />
          }
        >
          {filteredInstitutes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏛️</Text>
              <Text style={styles.emptyTitle}>No Institutes Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try clearing your search term or filter chips.'
                  : 'No tenant institutes registered yet on TuitionOS Cloud.'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                >
                  <Text style={styles.emptyResetText}>Clear Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={onOpenCreateModal}
                >
                  <Text style={styles.emptyResetText}>+ Provision First Institute</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredInstitutes.map((inst) => {
              const statusCfg = getStatusBadgeStyle(inst.status || 'ACTIVE');
              const initialLetter = (inst.name || 'I')[0].toUpperCase();
              const isSuspended = inst.status === 'SUSPENDED';
              const isUpdatingThis = updatingId === inst.id;

              return (
                <View key={inst.id} style={styles.instituteCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>{initialLetter}</Text>
                      </View>
                      <View style={styles.headerTextGroup}>
                        <View style={styles.nameRow}>
                          <Text style={styles.instName} numberOfLines={1}>
                            {inst.name}
                          </Text>
                          {inst.code ? (
                            <View style={styles.codeBadge}>
                              <Text style={styles.codeText}>{inst.code}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.instIdSub}>
                          Tenant ID: {inst.id.slice(0, 12)}...
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusCfg.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusCfg.text },
                        ]}
                      >
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata Row */}
                  <View style={styles.metaSection}>
                    {inst.email ? (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaIcon}>✉️</Text>
                        <Text style={styles.metaText} numberOfLines={1}>
                          {inst.email}
                        </Text>
                      </View>
                    ) : null}

                    {inst.phone ? (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaIcon}>📞</Text>
                        <Text style={styles.metaText}>{inst.phone}</Text>
                      </View>
                    ) : null}

                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>🗓️</Text>
                      <Text style={styles.metaText}>
                        Provisioned {formatDate(inst.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Metric Counts */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNum}>
                        {inst._count?.students ?? 0}
                      </Text>
                      <Text style={styles.metricTitle}>Students</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNum}>
                        {inst._count?.staffProfiles ?? 0}
                      </Text>
                      <Text style={styles.metricTitle}>Staff</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricNum}>
                        {inst._count?.batches ?? 0}
                      </Text>
                      <Text style={styles.metricTitle}>Batches</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionsRow}>
                    <PressableScale
                      style={styles.detailsBtn}
                      onPress={() => onSelectInstitute(inst)}
                      activeScale={0.96}
                    >
                      <Text style={styles.detailsBtnText}>⚙️ Manage & Details</Text>
                    </PressableScale>

                    <PressableScale
                      style={[
                        styles.statusToggleBtn,
                        isSuspended ? styles.activateBtn : styles.suspendBtn,
                      ]}
                      onPress={() => handleToggleStatus(inst)}
                      disabled={isUpdatingThis}
                      activeScale={0.96}
                    >
                      {isUpdatingThis ? (
                        <ActivityIndicator
                          size="small"
                          color={isSuspended ? '#2E7D32' : '#C62828'}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.statusToggleBtnText,
                            isSuspended
                              ? styles.activateBtnText
                              : styles.suspendBtnText,
                          ]}
                        >
                          {isSuspended ? '▶ Activate' : '⏸ Suspend'}
                        </Text>
                      )}
                    </PressableScale>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
    fontWeight: '500',
  },
  provisionBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  provisionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#3E2723',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#8D6E63',
    fontSize: 14,
    fontWeight: '700',
  },
  filterScroll: {
    marginTop: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5ECE8',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  filterPillActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D4C41',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8D6E63',
    fontWeight: '500',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyResetText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  instituteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    elevation: 2,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5ECE8',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4E342E',
  },
  headerTextGroup: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  instName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E2723',
  },
  codeBadge: {
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5D4037',
  },
  instIdSub: {
    fontSize: 10,
    color: '#A1887F',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  metaSection: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '500',
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E2723',
  },
  metricTitle: {
    fontSize: 10,
    color: '#8D6E63',
    fontWeight: '600',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#EFEBE9',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsBtn: {
    flex: 1.4,
    backgroundColor: '#F5ECE8',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  suspendBtn: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  suspendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
  },
  activateBtn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  activateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
});
