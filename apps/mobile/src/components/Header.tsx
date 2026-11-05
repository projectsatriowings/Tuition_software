import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useMobileAuth, MobileBranch } from '../context/AuthContext';
import { themeTokens } from '@tuition/shared';
import { Bell, RotateCw, LogOut, Building2, ChevronDown, Check, X } from 'lucide-react-native';
import { PressableScale } from '../theme/motion';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const { user, institute, branches, activeBranch, selectBranch, logout } = useMobileAuth();
  const [showBranchModal, setShowBranchModal] = useState(false);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ACADEMIC_ADMIN': return 'Director / Admin';
      case 'STAFF': return 'Faculty / Staff';
      case 'PARENT': return 'Parent';
      case 'STUDENT': return 'Student';
      default: return role || '';
    }
  };

  const handleSelectBranch = async (branch: MobileBranch | null) => {
    await selectBranch(branch);
    setShowBranchModal(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.[0] || 'U'}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.fullName || 'TuitionOS User'}
            </Text>
            <View style={styles.roleBadgeRow}>
              <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
              {institute && (
                <Text style={styles.instituteText}> • {institute.code}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {onOpenNotifications && (
            <TouchableOpacity onPress={onOpenNotifications} style={[styles.actionBtn, styles.bellBtn]} accessibilityLabel="Notifications">
              <Bell size={18} color={themeTokens.colors.textLight} />
              {unreadNotificationsCount > 0 && (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeDotText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} style={styles.actionBtn} accessibilityLabel="Refresh">
              <RotateCw size={16} color={themeTokens.colors.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={logout} style={[styles.actionBtn, styles.logoutBtn]} accessibilityLabel="Sign Out">
            <LogOut size={13} color={themeTokens.colors.textLight} style={{ marginRight: 4 }} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Branch Context Selector Bar */}
      {branches.length > 1 && (
        <View style={styles.branchRow}>
          <TouchableOpacity
            style={styles.branchSelectorPill}
            onPress={() => setShowBranchModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Switch active physical branch"
          >
            <Building2 size={13} color="#D7CCC8" />
            <Text style={styles.branchText} numberOfLines={1}>
              {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'All Branches (Consolidated)'}
            </Text>
            <ChevronDown size={12} color="#D7CCC8" />
          </TouchableOpacity>
        </View>
      )}

      {branches.length === 1 && (
        <View style={styles.branchRow}>
          <View style={styles.singleBranchBadge}>
            <Building2 size={12} color="#D7CCC8" />
            <Text style={styles.singleBranchText} numberOfLines={1}>
              📍 {branches[0].name} ({branches[0].code}) {branches[0].isDefault ? '[HQ]' : ''}
            </Text>
          </View>
        </View>
      )}

      {(title || subtitle) && (
        <View style={styles.titleSection}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* Branch Selector Bottom Sheet */}
      <InteractiveBottomSheet
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title="Select Campus Branch"
        subtitle="Scope analytics, batches, attendance and records to branch"
      >
        <View style={styles.modalContent}>
          {/* Option: All Branches */}
          <PressableScale
            onPress={() => handleSelectBranch(null)}
            style={[styles.branchOptionCard, !activeBranch && styles.branchOptionActive]}
          >
            <View style={styles.branchOptionLeft}>
              <View style={[styles.iconCircle, !activeBranch && styles.iconCircleActive]}>
                <Building2 size={18} color={!activeBranch ? '#FFFFFF' : '#4E342E'} />
              </View>
              <View>
                <Text style={[styles.branchOptionTitle, !activeBranch && styles.branchOptionTitleActive]}>
                  🏢 All Branches (Consolidated)
                </Text>
                <Text style={styles.branchOptionSubtitle}>
                  View combined metrics across all campuses
                </Text>
              </View>
            </View>
            {!activeBranch && <Check size={18} color="#4E342E" strokeWidth={2.5} />}
          </PressableScale>

          {/* Individual Physical Branches */}
          {branches.map((b) => {
            const isSelected = activeBranch?.id === b.id;
            return (
              <PressableScale
                key={b.id}
                onPress={() => handleSelectBranch(b)}
                style={[styles.branchOptionCard, isSelected && styles.branchOptionActive]}
              >
                <View style={styles.branchOptionLeft}>
                  <View style={[styles.iconCircle, isSelected && styles.iconCircleActive]}>
                    <Building2 size={18} color={isSelected ? '#FFFFFF' : '#4E342E'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.branchOptionTitle, isSelected && styles.branchOptionTitleActive]}>
                        {b.name}
                      </Text>
                      {b.isDefault && (
                        <View style={styles.hqBadge}>
                          <Text style={styles.hqBadgeText}>HQ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.branchOptionSubtitle}>
                      Code: {b.code} {b.city ? `• ${b.city}` : ''}
                    </Text>
                  </View>
                </View>
                {isSelected && <Check size={18} color="#4E342E" strokeWidth={2.5} />}
              </PressableScale>
            );
          })}
        </View>
      </InteractiveBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeTokens.colors.espresso,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.cocoa,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeTokens.colors.cocoa,
    borderWidth: 1,
    borderColor: themeTokens.colors.taupe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: themeTokens.colors.textLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roleText: {
    color: '#D7CCC8',
    fontSize: 11,
    fontWeight: '600',
  },
  instituteText: {
    color: '#BCAAA4',
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    position: 'relative',
    paddingHorizontal: 8,
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#5D4037',
  },
  logoutBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 11,
    fontWeight: '600',
  },
  branchRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5D4037',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6D4C41',
  },
  branchText: {
    color: '#FAF7F2',
    fontSize: 11.5,
    fontWeight: '700',
    maxWidth: 240,
  },
  singleBranchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  singleBranchText: {
    color: '#D7CCC8',
    fontSize: 11,
    fontWeight: '600',
  },
  titleSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#5D4037',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeTokens.colors.textLight,
  },
  subtitle: {
    fontSize: 11.5,
    color: '#D7CCC8',
    marginTop: 1,
  },
  modalContent: {
    padding: 16,
    gap: 10,
  },
  branchOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
  },
  branchOptionActive: {
    backgroundColor: '#F5ECE8',
    borderColor: '#4E342E',
  },
  branchOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFEBE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#4E342E',
  },
  branchOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1E18',
  },
  branchOptionTitleActive: {
    color: '#4E342E',
  },
  branchOptionSubtitle: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  hqBadge: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  hqBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
