import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMobileAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh }) => {
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
          <View>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.fullName || 'TuitionOS User'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
              {institute && (
                <Text style={styles.instituteText}> &bull; {institute.code}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
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
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#818cf8',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  roleText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  instituteText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  titleSection: {
    marginTop: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
});
