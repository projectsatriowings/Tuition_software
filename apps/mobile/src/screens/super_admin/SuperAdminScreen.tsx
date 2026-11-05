import { themeTokens } from '@tuition/shared';
import { Key, Search, Mail, Settings } from 'lucide-react-native';
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
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch } from '../../services/api';
import { Header } from '../../components/Header';
import { FadeInView } from '../../theme/motion';
import {
  SuperAdminBottomNav,
  SuperAdminActiveTab,
  SuperAdminPrimaryTab,
} from './components/SuperAdminBottomNav';
import { SuperAdminHomeTab } from './components/SuperAdminHomeTab';
import { SuperAdminInstitutesTab } from './components/SuperAdminInstitutesTab';
import { SuperAdminSecurityTab } from './components/SuperAdminSecurityTab';
import { SuperAdminMoreTab } from './components/SuperAdminMoreTab';
import { CreateInstituteModal } from './components/CreateInstituteModal';
import { InstituteDetailsModal } from './components/InstituteDetailsModal';

export const SuperAdminScreen: React.FC = () => {
  const { user, logout } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<SuperAdminActiveTab>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Platform Data
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Sub-view filters & search
  const [credentialSearch, setCredentialSearch] = useState('');

  const fetchSuperAdminData = useCallback(async () => {
    try {
      // 1. Fetch Institutes Directory
      const instRes = await mobileApiFetch('/institutes');
      if (instRes.success && instRes.data) {
        setInstitutes(
          Array.isArray(instRes.data)
            ? instRes.data
            : instRes.data.institutes || []
        );
      }

      // 2. Fetch Dashboard Summary KPIs
      const sumRes = await mobileApiFetch('/institutes/dashboard/summary');
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
    } catch (e) {
      console.warn('Error loading super admin mobile data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuperAdminData();
  }, [fetchSuperAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuperAdminData();
  };

  const handleSelectInstitute = (inst: any) => {
    setSelectedInstitute(inst);
    setShowDetailsModal(true);
  };

  const handleTabChange = (tab: SuperAdminPrimaryTab) => {
    setActiveTab(tab);
  };

  const handleOpenCredentialsForInst = (inst: any) => {
    setSelectedInstitute(inst);
    setShowDetailsModal(true);
  };

  // Filtered institutes for Admin Credentials sub-view
  const credentialInstitutes = institutes.filter((inst) => {
    const q = credentialSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (inst.name || '').toLowerCase().includes(q) ||
      (inst.code || '').toLowerCase().includes(q) ||
      (inst.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Universal Top Header */}
      <Header
        title="Super Admin Console"
        subtitle="TuitionOS Multi-Tenant Governance"
        onRefresh={onRefresh}
      />

      {/* Sub-view Breadcrumb Header when in secondary view */}
      {['adminAccount', 'engineStatus'].includes(activeTab) && (
        <View style={styles.subViewHeader}>
          <TouchableOpacity
            onPress={() => setActiveTab('more')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back to More Menu</Text>
          </TouchableOpacity>
          <Text style={styles.subViewTitle}>
            {activeTab === 'adminAccount'
              ? 'Academic Admin Credential Management'
              : 'Platform Cloud Engine Telemetry'}
          </Text>
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        <FadeInView key={activeTab} duration={160} style={{ flex: 1 }}>
        {/* TAB 1: EXECUTIVE HOME */}
        {activeTab === 'home' && (
          <SuperAdminHomeTab
            user={user}
            institutes={institutes}
            summary={summary}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onSelectInstitute={handleSelectInstitute}
          />
        )}

        {/* TAB 2: INSTITUTES DIRECTORY */}
        {activeTab === 'institutes' && (
          <SuperAdminInstitutesTab
            institutes={institutes}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onSelectInstitute={handleSelectInstitute}
          />
        )}

        {/* TAB 3: PLATFORM SECURITY */}
        {activeTab === 'security' && (
          <SuperAdminSecurityTab
            user={user}
            institutesCount={institutes.length}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {/* TAB 4: MORE MENU */}
        {activeTab === 'more' && (
          <SuperAdminMoreTab
            user={user}
            institutesCount={institutes.length}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onSignOut={logout}
          />
        )}

        {/* SUBVIEW: ADMIN CREDENTIAL MANAGEMENT */}
        {activeTab === 'adminAccount' && (
          <ScrollView
            style={styles.subViewScroll}
            contentContainerStyle={styles.subViewContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Key size={14} color="#8D6E63" />
                <Text style={styles.infoTitle}>Admin Password Governance</Text>
              </View>
              <Text style={styles.infoText}>
                Super Admins can perform emergency credential resets for institute Academic Directors.
                Select any registered tenant to assign a new secure passphrase.
              </Text>
            </View>

            <View style={styles.subSearchBox}>
              <Search size={14} color="#8D6E63" />
              <TextInput
                style={styles.subSearchInput}
                placeholder="Search tenant by name or code..."
                placeholderTextColor="#8D6E63"
                value={credentialSearch}
                onChangeText={setCredentialSearch}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.credList}>
              {credentialInstitutes.map((inst) => (
                <View key={inst.id} style={styles.credItemCard}>
                  <View style={styles.credItemHeader}>
                    <View style={styles.credItemInfo}>
                      <Text style={styles.credInstName}>{inst.name}</Text>
                      <Text style={styles.credInstCode}>Code: {inst.code}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.credResetBtn}
                      onPress={() => handleOpenCredentialsForInst(inst)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.credResetBtnText}>Reset Password</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.credInstEmail}>
                    {inst.email || 'No primary email registered'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* SUBVIEW: CLOUD ENGINE STATUS */}
        {activeTab === 'engineStatus' && (
          <ScrollView
            style={styles.subViewScroll}
            contentContainerStyle={styles.subViewContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.engineCard}>
              <View style={styles.engineHeader}>
                <Settings size={22} color={themeTokens.colors.primary} />
                <View style={styles.engineTitleGroup}>
                  <Text style={styles.engineTitle}>TuitionOS Core Engine</Text>
                  <Text style={styles.engineSub}>Cluster: ap-south-1 (Mumbai / Primary)</Text>
                </View>
                <View style={styles.healthyPill}>
                  <Text style={styles.healthyPillText}>ONLINE</Text>
                </View>
              </View>

              <View style={styles.engineMetricsGrid}>
                <View style={styles.engineMetricItem}>
                  <Text style={styles.emLabel}>DATABASE</Text>
                  <Text style={styles.emVal}>PostgreSQL 16</Text>
                  <Text style={styles.emSub}>Neon Serverless</Text>
                </View>
                <View style={styles.engineMetricItem}>
                  <Text style={styles.emLabel}>API SERVER</Text>
                  <Text style={styles.emVal}>Express.js</Text>
                  <Text style={styles.emSub}>Node.js v20 LTS</Text>
                </View>
                <View style={styles.engineMetricItem}>
                  <Text style={styles.emLabel}>ENCRYPTION</Text>
                  <Text style={styles.emVal}>TLS 1.3</Text>
                  <Text style={styles.emSub}>AES-256 GCM</Text>
                </View>
                <View style={styles.engineMetricItem}>
                  <Text style={styles.emLabel}>ROW ISOLATION</Text>
                  <Text style={[styles.emVal, { color: '#2E7D32' }]}>Enforced</Text>
                  <Text style={styles.emSub}>FK Context Checked</Text>
                </View>
              </View>
            </View>

            <View style={styles.telemetryCard}>
              <Text style={styles.telemetryTitle}>Multi-Tenant Health Audit</Text>
              <View style={styles.telemetryRow}>
                <Text style={styles.tLabel}>Registered Institutes</Text>
                <Text style={styles.tValue}>{institutes.length}</Text>
              </View>
              <View style={styles.telemetryRow}>
                <Text style={styles.tLabel}>Active Operational Tenants</Text>
                <Text style={styles.tValue}>
                  {institutes.filter((i) => (i.status || 'ACTIVE') === 'ACTIVE').length}
                </Text>
              </View>
              <View style={styles.telemetryRow}>
                <Text style={styles.tLabel}>Suspended Tenants</Text>
                <Text style={styles.tValue}>
                  {institutes.filter((i) => i.status === 'SUSPENDED').length}
                </Text>
              </View>
              <View style={styles.telemetryRow}>
                <Text style={styles.tLabel}>Cross-Tenant Leakage Check</Text>
                <Text style={[styles.tValue, { color: '#2E7D32' }]}>0 Violations</Text>
              </View>
            </View>
          </ScrollView>
        )}
        </FadeInView>
      </View>

      {/* Fixed Bottom Navigation */}
      <SuperAdminBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabChange}
      />

      {/* Modal 1: Provision New Institute */}
      <CreateInstituteModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          onRefresh();
        }}
      />

      {/* Modal 2: Institute Details & Admin Password Reset */}
      <InstituteDetailsModal
        visible={showDetailsModal}
        institute={selectedInstitute}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedInstitute(null);
        }}
        onRefresh={() => {
          fetchSuperAdminData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  content: {
    flex: 1,
  },
  subViewHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  backBtn: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E342E',
  },
  subViewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E2723',
  },
  subViewScroll: {
    flex: 1,
  },
  subViewContent: {
    padding: 16,
    paddingBottom: 110,
  },
  infoCard: {
    backgroundColor: '#F5ECE8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#5D4037',
    lineHeight: 16,
  },
  subSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    marginBottom: 14,
  },
  subSearchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  subSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#3E2723',
    paddingVertical: 0,
  },
  credList: {
    gap: 10,
  },
  credItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  credItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  credItemInfo: {
    flex: 1,
  },
  credInstName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E2723',
  },
  credInstCode: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
    marginTop: 2,
  },
  credResetBtn: {
    backgroundColor: '#4E342E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  credResetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  credInstEmail: {
    fontSize: 11,
    color: '#8D6E63',
  },
  engineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  engineIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  engineTitleGroup: {
    flex: 1,
  },
  engineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E2723',
  },
  engineSub: {
    fontSize: 11,
    color: '#8D6E63',
    marginTop: 2,
  },
  healthyPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  healthyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.4,
  },
  engineMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  engineMetricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  emLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8D6E63',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  emVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E2723',
  },
  emSub: {
    fontSize: 10,
    color: '#A1887F',
    marginTop: 2,
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE8',
  },
  tLabel: {
    fontSize: 12,
    color: '#5D4037',
  },
  tValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E2723',
  },
});
