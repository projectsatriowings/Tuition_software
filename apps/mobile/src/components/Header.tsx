import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMobileAuth } from '../context/AuthContext';
import { themeTokens } from '@tuition/shared';

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
  const { user, institute, logout } = useMobileAuth();

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
            <TouchableOpacity onPress={onOpenNotifications} style={[styles.actionBtn, styles.bellBtn]}>
              <Text style={styles.bellBtnText}>🔔</Text>
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
            <TouchableOpacity onPress={onRefresh} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>↻</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={logout} style={[styles.actionBtn, styles.logoutBtn]}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(title || subtitle) && (
        <View style={styles.titleSection}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  roleText: {
    color: themeTokens.colors.beige,
    fontSize: 11,
    fontWeight: '600',
  },
  instituteText: {
    color: themeTokens.colors.textLightMuted,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    position: 'relative',
  },
  bellBtnText: {
    fontSize: 14,
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: themeTokens.colors.cocoa,
  },
  actionBtnText: {
    color: themeTokens.colors.beige,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: 'rgba(185, 28, 28, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.5)',
  },
  logoutBtnText: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  titleSection: {
    marginTop: 12,
  },
  title: {
    color: themeTokens.colors.textLight,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: themeTokens.colors.beige,
    fontSize: 12,
    marginTop: 2,
  },
});
