import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Easing,
  BackHandler,
  ScrollView,
  Platform,
} from 'react-native';
import { useMobileAuth, MobileBranch } from '../context/AuthContext';
import { themeTokens } from '@tuition/shared';
import {
  Bell,
  RotateCw,
  LogOut,
  Building2,
  ChevronDown,
  Check,
  X,
  Menu,
  Home,
  GraduationCap,
  Sparkles,
  Users,
  BookOpen,
  ClipboardCheck,
  FileText,
  Trophy,
  CalendarCheck,
  MessageSquare,
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Layers,
  ChevronRight,
  Clock,
  Bot,
} from 'lucide-react-native';
import { PressableScale, useReducedMotion } from '../theme/motion';
import { InteractiveBottomSheet } from './ui/InteractiveBottomSheet';
import { ConfirmationModal } from './ConfirmationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onNavigateTab?: (tab: string) => void;
  onOpenProfile?: () => void;
  onOpenBranchModal?: () => void;
  onOpenFeeStructures?: () => void;
  onOpenPayroll?: () => void;
  onOpenAIQuestionGen?: () => void;
  onOpenMyAttendance?: () => void;
  onOpenMyPayslips?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onNavigateTab,
  onOpenProfile,
  onOpenBranchModal,
  onOpenFeeStructures,
  onOpenPayroll,
  onOpenAIQuestionGen,
  onOpenMyAttendance,
  onOpenMyPayslips,
}) => {
  const { user, institute, branches, activeBranch, selectBranch, logout } = useMobileAuth();
  const reducedMotion = useReducedMotion();

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Animations
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(unreadNotificationsCount > 0 ? 1 : 0)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Unread badge pop animation
  useEffect(() => {
    if (unreadNotificationsCount > 0) {
      if (reducedMotion) {
        badgeScale.setValue(1);
      } else {
        badgeScale.setValue(0.3);
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 3.5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }
    } else {
      badgeScale.setValue(0);
    }
  }, [unreadNotificationsCount, reducedMotion, badgeScale]);

  // Refresh icon rotation animation
  useEffect(() => {
    if (refreshing) {
      if (!spinLoopRef.current) {
        spinLoopRef.current = Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
      }
      spinLoopRef.current.start();
    } else {
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [refreshing, spinValue]);

  // Handle hardware back for drawer
  useEffect(() => {
    if (!isDrawerOpen) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });
    return () => backHandler.remove();
  }, [isDrawerOpen]);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    if (reducedMotion) {
      drawerTranslateX.setValue(0);
      backdropOpacity.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(drawerTranslateX, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const closeDrawer = (callback?: () => void) => {
    if (reducedMotion) {
      drawerTranslateX.setValue(-DRAWER_WIDTH);
      backdropOpacity.setValue(0);
      setIsDrawerOpen(false);
      if (callback) callback();
      return;
    }

    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
      if (callback) callback();
    });
  };

  const handleRefreshPress = () => {
    if (!onRefresh) return;
    if (!refreshing && !reducedMotion) {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 650,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
    onRefresh();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ACADEMIC_ADMIN':
        return 'Director / Admin';
      case 'STAFF':
        return 'Faculty / Staff';
      case 'PARENT':
        return 'Parent';
      case 'STUDENT':
        return 'Student';
      default:
        return role || '';
    }
  };

  const handleSelectBranch = async (branch: MobileBranch | null) => {
    await selectBranch(branch);
    setShowBranchModal(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Role-specific navigation destinations in Drawer
  const getDrawerNavItems = () => {
    const role = user?.role;
    switch (role) {
      case 'ACADEMIC_ADMIN':
        return [
          { id: 'home', label: 'Executive Dashboard', sub: 'KPIs & overview', icon: (c: string) => <Home size={18} color={c} /> },
          { id: 'students', label: 'Student Directory', sub: 'Admit, roster & details', icon: (c: string) => <GraduationCap size={18} color={c} /> },
          { id: 'staff', label: 'Faculty & Staff', sub: 'Manage team & roles', icon: (c: string) => <Users size={18} color={c} /> },
          { id: 'academics', label: 'Academics & Batches', sub: 'Classes & schedules', icon: (c: string) => <Layers size={18} color={c} /> },
          { id: 'fees', label: 'Fee Collections', sub: 'Dues & payments', icon: (c: string) => <CreditCard size={18} color={c} /> },
          ...(onOpenFeeStructures
            ? [{ id: 'fee_structures_modal', label: 'Fee Structures', sub: 'Tuition fees & rules', icon: (c: string) => <CreditCard size={18} color={c} />, isAction: true, action: onOpenFeeStructures }]
            : []),
          ...(onOpenBranchModal || branches.length > 1
            ? [{ id: 'branch_modal', label: 'Campus Branches', sub: 'Multi-branch control', icon: (c: string) => <Building2 size={18} color={c} />, isAction: true, action: onOpenBranchModal || (() => setShowBranchModal(true)) }]
            : []),
          ...(onOpenPayroll
            ? [{ id: 'payroll_modal', label: 'Faculty Payroll', sub: 'Salary & payouts', icon: (c: string) => <CreditCard size={18} color={c} />, isAction: true, action: onOpenPayroll }]
            : []),
          ...(onOpenAIQuestionGen
            ? [{ id: 'ai_modal', label: 'AI Question Generator', sub: 'Exams & quiz papers', icon: (c: string) => <Bot size={18} color={c} />, isAction: true, action: onOpenAIQuestionGen }]
            : []),
        ];
      case 'STAFF':
        return [
          { id: 'home', label: 'Faculty Dashboard', sub: 'Classes & daily KPIs', icon: (c: string) => <Home size={18} color={c} /> },
          { id: 'attendance', label: 'Mark Attendance', sub: 'Roster & verification', icon: (c: string) => <ClipboardCheck size={18} color={c} /> },
          { id: 'students', label: 'Student Directory', sub: 'Find & review students', icon: (c: string) => <GraduationCap size={18} color={c} /> },
          { id: 'materials', label: 'Study Materials', sub: 'Uploads & resources', icon: (c: string) => <BookOpen size={18} color={c} /> },
          { id: 'homework', label: 'Homework & Tasks', sub: 'Assign & track tasks', icon: (c: string) => <FileText size={18} color={c} /> },
          { id: 'exams', label: 'Exams & Grading', sub: 'Mark entry & reports', icon: (c: string) => <Trophy size={18} color={c} /> },
          ...(onOpenMyAttendance
            ? [{ id: 'my_attendance_modal', label: 'My Attendance & WFH', sub: 'Self-checkin & logs', icon: (c: string) => <Clock size={18} color={c} />, isAction: true, action: onOpenMyAttendance }]
            : []),
          ...(onOpenMyPayslips
            ? [{ id: 'my_payslips_modal', label: 'My Salary & Payslips', sub: 'Monthly earnings', icon: (c: string) => <CreditCard size={18} color={c} />, isAction: true, action: onOpenMyPayslips }]
            : []),
          ...(onOpenAIQuestionGen
            ? [{ id: 'ai_modal', label: 'AI Question Generator', sub: 'Instant question bank', icon: (c: string) => <Bot size={18} color={c} />, isAction: true, action: onOpenAIQuestionGen }]
            : []),
        ];
      case 'STUDENT':
        return [
          { id: 'home', label: 'Student Home', sub: 'Tasks & class updates', icon: (c: string) => <Home size={18} color={c} /> },
          { id: 'learning', label: 'Learning Materials', sub: 'Notes & study files', icon: (c: string) => <BookOpen size={18} color={c} /> },
          { id: 'homework', label: 'Homework & Quizzes', sub: 'Assignments & submissions', icon: (c: string) => <FileText size={18} color={c} /> },
          { id: 'results', label: 'Exam Results', sub: 'Marks & performance', icon: (c: string) => <Trophy size={18} color={c} /> },
          { id: 'progress', label: 'Attendance & Progress', sub: 'Attendance report', icon: (c: string) => <CalendarCheck size={18} color={c} /> },
          { id: 'timetable', label: 'Class Timetable', sub: 'Schedule & timings', icon: (c: string) => <Clock size={18} color={c} /> },
          { id: 'fees', label: 'Tuition Fee Invoices', sub: 'Receipts & dues', icon: (c: string) => <CreditCard size={18} color={c} /> },
        ];
      case 'PARENT':
        return [
          { id: 'home', label: 'Family Dashboard', sub: 'Ward overview', icon: (c: string) => <Home size={18} color={c} /> },
          { id: 'attendance', label: 'Child Attendance', sub: 'Daily logs & alerts', icon: (c: string) => <CalendarCheck size={18} color={c} /> },
          { id: 'learning', label: 'Study Materials', sub: 'Syllabus & files', icon: (c: string) => <BookOpen size={18} color={c} /> },
          { id: 'messages', label: 'Teacher Messages', sub: 'Direct faculty chat', icon: (c: string) => <MessageSquare size={18} color={c} /> },
          { id: 'homework', label: 'Homework Status', sub: 'Pending assignments', icon: (c: string) => <FileText size={18} color={c} /> },
          { id: 'fees', label: 'Fee Statements', sub: 'Online payments & receipts', icon: (c: string) => <CreditCard size={18} color={c} /> },
          { id: 'progress', label: 'Academic Progress', sub: 'Report cards & exams', icon: (c: string) => <Trophy size={18} color={c} /> },
        ];
      case 'SUPER_ADMIN':
        return [
          { id: 'home', label: 'Platform Dashboard', sub: 'Tenant metrics & health', icon: (c: string) => <LayoutDashboard size={18} color={c} /> },
          { id: 'institutes', label: 'Institutes Directory', sub: 'All provisioned academies', icon: (c: string) => <Building2 size={18} color={c} /> },
          { id: 'security', label: 'Platform Security', sub: 'Audit logs & access', icon: (c: string) => <ShieldCheck size={18} color={c} /> },
          { id: 'adminAccount', label: 'Admin Credentials', sub: 'Security & secrets', icon: (c: string) => <CreditCard size={18} color={c} /> },
        ];
      default:
        return [
          { id: 'home', label: 'Home Dashboard', sub: 'Overview', icon: (c: string) => <Home size={18} color={c} /> },
        ];
    }
  };

  const drawerNavItems = getDrawerNavItems();

  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        {/* Left Section: Hamburger Menu & App Logo */}
        <View style={styles.leftSection}>
          <PressableScale
            onPress={openDrawer}
            style={styles.hamburgerBtn}
            activeScale={0.92}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Menu size={20} color={themeTokens.colors.textLight} strokeWidth={2.2} />
          </PressableScale>

          <View style={styles.brandBox}>
            <View style={styles.logoBadge}>
              <GraduationCap size={16} color="#FFD54F" strokeWidth={2.4} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={styles.brandName}>TuitionOS</Text>
                <Sparkles size={10} color="#FFD54F" />
              </View>
              {institute ? (
                <Text style={styles.institutePill} numberOfLines={1}>
                  {institute.code || institute.name}
                </Text>
              ) : (
                <Text style={styles.institutePill}>Enterprise</Text>
              )}
            </View>
          </View>
        </View>

        {/* Right Section: Action Controls */}
        <View style={styles.actions}>
          {/* Notifications Button with Animated Pop Badge */}
          {onOpenNotifications && (
            <PressableScale
              onPress={onOpenNotifications}
              style={[styles.actionBtn, styles.bellBtn]}
              activeScale={0.92}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadNotificationsCount} unread`}
            >
              <Bell size={18} color={themeTokens.colors.textLight} strokeWidth={2.2} />
              {unreadNotificationsCount > 0 && (
                <Animated.View
                  style={[
                    styles.badgeDot,
                    { transform: [{ scale: badgeScale }] },
                  ]}
                >
                  <Text style={styles.badgeDotText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </Animated.View>
              )}
            </PressableScale>
          )}

          {/* Refresh Action with Smooth Rotation */}
          {onRefresh && (
            <PressableScale
              onPress={handleRefreshPress}
              style={styles.actionBtn}
              activeScale={0.92}
              accessibilityRole="button"
              accessibilityLabel="Refresh content"
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <RotateCw size={17} color={themeTokens.colors.textLight} strokeWidth={2.2} />
              </Animated.View>
            </PressableScale>
          )}

          {/* User Profile Avatar Thumbnail */}
          <PressableScale
            onPress={openDrawer}
            style={styles.avatarThumbnail}
            activeScale={0.92}
            accessibilityRole="button"
            accessibilityLabel={`User profile: ${user?.fullName || 'User'}`}
          >
            <Text style={styles.avatarThumbnailText}>
              {user?.fullName?.[0] || 'U'}
            </Text>
          </PressableScale>

          {/* Quick Sign Out Action */}
          <PressableScale
            onPress={() => setShowLogoutConfirm(true)}
            style={[styles.actionBtn, styles.logoutBtn]}
            activeScale={0.92}
            accessibilityRole="button"
            accessibilityLabel="Sign out of TuitionOS"
          >
            <LogOut size={14} color={themeTokens.colors.textLight} strokeWidth={2.2} />
          </PressableScale>
        </View>
      </View>

      {/* Multi-Branch Context Indicator Bar */}
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

      {/* Screen Title & Subtitle (if passed) */}
      {(title || subtitle) && (
        <View style={styles.titleSection}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* Animated Navigation Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeDrawer()}
      >
        <View style={styles.drawerOverlay}>
          {/* Dimming Backdrop */}
          <Animated.View
            style={[
              styles.drawerBackdrop,
              { opacity: backdropOpacity },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => closeDrawer()}
              accessibilityLabel="Close navigation drawer"
            />
          </Animated.View>

          {/* Slide-in Drawer Container */}
          <Animated.View
            style={[
              styles.drawerContainer,
              { transform: [{ translateX: drawerTranslateX }] },
            ]}
          >
            {/* Drawer Header: TuitionOS Brand & Close Button */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandRow}>
                <View style={styles.drawerLogoBadge}>
                  <GraduationCap size={22} color="#FFD54F" strokeWidth={2.4} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.drawerBrandTitle}>TuitionOS</Text>
                    <Sparkles size={12} color="#FFD54F" />
                  </View>
                  <Text style={styles.drawerBrandSub}>Enterprise Edition</Text>
                </View>
              </View>
              <PressableScale
                onPress={() => closeDrawer()}
                style={styles.drawerCloseBtn}
                activeScale={0.9}
                accessibilityRole="button"
                accessibilityLabel="Close drawer"
              >
                <X size={18} color="#D7CCC8" strokeWidth={2.2} />
              </PressableScale>
            </View>

            {/* User Profile Card */}
            <View style={styles.drawerProfileCard}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>
                  {user?.fullName?.[0] || 'U'}
                </Text>
              </View>
              <View style={styles.drawerUserDetails}>
                <Text style={styles.drawerUserName} numberOfLines={1}>
                  {user?.fullName || 'TuitionOS User'}
                </Text>
                <View style={styles.drawerRoleBadge}>
                  <Text style={styles.drawerRoleText}>
                    {getRoleLabel(user?.role)}
                  </Text>
                </View>
                {institute && (
                  <Text style={styles.drawerInstituteText} numberOfLines={1}>
                    🏛 {institute.name}
                  </Text>
                )}
              </View>
            </View>

            {/* Scrollable Navigation Destinations */}
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerSectionLabel}>NAVIGATION & TOOLS</Text>

              {drawerNavItems.map((item) => (
                <PressableScale
                  key={item.id}
                  style={styles.drawerNavItem}
                  activeScale={0.96}
                  onPress={() => {
                    closeDrawer(() => {
                      if ('isAction' in item && item.isAction && item.action) {
                        item.action();
                      } else if (onNavigateTab) {
                        onNavigateTab(item.id);
                      }
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View style={styles.drawerNavIconWrap}>
                    {item.icon('#4E342E')}
                  </View>
                  <View style={styles.drawerNavTextBox}>
                    <Text style={styles.drawerNavTitle}>{item.label}</Text>
                    <Text style={styles.drawerNavSub}>{item.sub}</Text>
                  </View>
                  <ChevronRight size={16} color="#BCAAA4" />
                </PressableScale>
              ))}

              {/* Campus Branches section in Drawer if available */}
              {branches.length > 1 && (
                <>
                  <Text style={[styles.drawerSectionLabel, { marginTop: 16 }]}>
                    CAMPUS BRANCHES
                  </Text>
                  <PressableScale
                    style={styles.drawerNavItem}
                    activeScale={0.96}
                    onPress={() => {
                      closeDrawer(() => setShowBranchModal(true));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Switch active campus branch"
                  >
                    <View style={[styles.drawerNavIconWrap, { backgroundColor: '#E0F2FE' }]}>
                      <Building2 size={18} color="#0284C7" />
                    </View>
                    <View style={styles.drawerNavTextBox}>
                      <Text style={styles.drawerNavTitle}>Switch Campus</Text>
                      <Text style={styles.drawerNavSub}>
                        {activeBranch ? `${activeBranch.name}` : 'All Campuses (Consolidated)'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#BCAAA4" />
                  </PressableScale>
                </>
              )}
            </ScrollView>

            {/* Drawer Footer: App Info & Logout */}
            <View style={styles.drawerFooter}>
              <View style={styles.drawerFooterMeta}>
                <Text style={styles.drawerVersionText}>TuitionOS Mobile v2.4 • Production</Text>
                <Text style={styles.drawerSecurityText}>🛡 Secure Role-Isolated Session</Text>
              </View>

              <PressableScale
                style={styles.drawerLogoutBtn}
                onPress={() => {
                  closeDrawer(() => setShowLogoutConfirm(true));
                }}
                activeScale={0.95}
                accessibilityRole="button"
                accessibilityLabel="Sign out of application"
              >
                <LogOut size={16} color="#DC2626" strokeWidth={2.2} />
                <Text style={styles.drawerLogoutBtnText}>Sign Out of TuitionOS</Text>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sign Out of TuitionOS"
        message="Are you sure you want to end your current session? You can sign back in anytime with your credentials."
        variant="danger"
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Campus Branch Selector Bottom Sheet */}
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
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    paddingBottom: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5D4037',
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#3E2723',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6D4C41',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  institutePill: {
    color: '#D7CCC8',
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 130,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5D4037',
  },
  bellBtn: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: themeTokens.colors.espresso,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#5D4037',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThumbnailText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: '#4A2820',
    borderColor: '#6D382B',
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

  // Drawer Overlay Styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FAF7F2',
    borderRightWidth: 1,
    borderRightColor: '#EFEBE9',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 44,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#5D4037',
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3E2723',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6D4C41',
  },
  drawerBrandTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  drawerBrandSub: {
    color: '#FFD54F',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerProfileCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4E342E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  drawerUserDetails: {
    flex: 1,
  },
  drawerUserName: {
    color: '#2D1E18',
    fontSize: 14.5,
    fontWeight: '800',
  },
  drawerRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5ECE8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  drawerRoleText: {
    color: '#6D4C41',
    fontSize: 10.5,
    fontWeight: '700',
  },
  drawerInstituteText: {
    color: '#8D6E63',
    fontSize: 11,
    marginTop: 3,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    padding: 12,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D6E63',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  drawerNavIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  drawerNavTextBox: {
    flex: 1,
  },
  drawerNavTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2D1E18',
  },
  drawerNavSub: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 1,
  },
  drawerFooter: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEBE9',
  },
  drawerFooterMeta: {
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerVersionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8D6E63',
  },
  drawerSecurityText: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
    fontWeight: '600',
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10,
  },
  drawerLogoutBtnText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Modal Content Styles
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
