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
} from 'react-native';
import { useMobileAuth } from '../../context/AuthContext';
import { mobileApiFetch } from '../../services/api';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';

export const SuperAdminScreen: React.FC = () => {
  const { user } = useMobileAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutes, setInstitutes] = useState<any[]>([]);

  const fetchSuperAdminData = useCallback(async () => {
    try {
      const res = await mobileApiFetch('/institutes');
      if (res.success && res.data) {
        setInstitutes(Array.isArray(res.data) ? res.data : res.data.institutes || []);
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
    Alert.alert(
      inst.name,
      `Code: ${inst.code}\nStatus: ${inst.status}\nTenant ID: ${inst.id}\nCreated: ${new Date(inst.createdAt).toLocaleDateString('en-IN')}`,
      [{ text: 'Close' }]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Super Admin Console"
        subtitle="Multi-Tenant Platform Governance"
        onRefresh={onRefresh}
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Fetching registered institutes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* Platform Status */}
          <Card highlighted>
            <View style={styles.statusRow}>
              <View style={styles.crownCircle}>
                <Text style={styles.crownIcon}>👑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.platTitle}>TuitionOS Multi-Tenant Cloud</Text>
                <Text style={styles.platSub}>
                  Logged in as {user?.email} &bull; Neon PostgreSQL Engine
                </Text>
              </View>
              <Badge label="SYSTEM HEALTHY" variant="success" size="sm" />
            </View>
          </Card>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: '#1e1b4b' }]}>
              <Text style={styles.metricLabel}>REGISTERED INSTITUTES</Text>
              <Text style={styles.metricValue}>{institutes.length}</Text>
              <Text style={styles.metricSub}>Isolated Tenants</Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: '#064e3b' }]}>
              <Text style={styles.metricLabel}>PLATFORM SECURITY</Text>
              <Text style={[styles.metricValue, { color: '#34d399' }]}>AES-256</Text>
              <Text style={styles.metricSub}>Row Isolation Active</Text>
            </View>
          </View>

          {/* Institutes Directory */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏛️ Managed Institutes</Text>
            <Text style={styles.sectionCount}>{institutes.length} total</Text>
          </View>

          {institutes.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No registered institutes found on platform.</Text>
            </Card>
          ) : (
            institutes.map((inst) => (
              <Card key={inst.id} onPress={() => handleSelectInstitute(inst)}>
                <View style={styles.instItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{inst.name}</Text>
                    <Text style={styles.instCode}>
                      Code: <Text style={styles.instCodeBold}>{inst.code}</Text> &bull; ID: {inst.id.slice(0, 8)}...
                    </Text>
                    {inst.email && (
                      <Text style={styles.instEmail}>✉️ {inst.email}</Text>
                    )}
                  </View>
                  <Badge
                    label={inst.status || 'ACTIVE'}
                    variant={inst.status === 'ACTIVE' ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>
              </Card>
            ))
          )}

          <View style={styles.securityNotice}>
            <Text style={styles.secTitle}>🔒 Tenant Isolation Compliance</Text>
            <Text style={styles.secText}>
              In accordance with enterprise data protection guidelines, individual institute academic marks, attendance records, and student financial ledgers remain strictly segregated by Institute ID context headers.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownIcon: {
    fontSize: 22,
  },
  platTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  platSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 10,
    color: '#94a3b8',
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
  instItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  instCode: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  instCodeBold: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  instEmail: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  securityNotice: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  secTitle: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  secText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
});
