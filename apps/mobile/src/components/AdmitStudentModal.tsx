import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { useMobileToast } from '../context/ToastContext';
import { themeTokens } from '@tuition/shared';

interface AdmitStudentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (student: any) => void;
}

export const AdmitStudentModal: React.FC<AdmitStudentModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useMobileToast();
  const [loading, setLoading] = useState(false);
  const [prefixInfo, setPrefixInfo] = useState<{
    prefix: string;
    currentYear: number;
    previewFormat: string;
  } | null>(null);

  const [batches, setBatches] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [batchId, setBatchId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Parent fields
  const [parentFullName, setParentFullName] = useState('');
  const [parentRelationship, setParentRelationship] = useState<'FATHER' | 'MOTHER' | 'GUARDIAN'>('FATHER');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentInitialPassword, setParentInitialPassword] = useState('');
  const [parentCanReceiveSms, setParentCanReceiveSms] = useState(true);

  // Success Confirmation State
  const [admittedResult, setAdmittedResult] = useState<{
    name: string;
    admissionNumber: string;
    studentIdentifier?: string;
    studentPassword?: string;
    parentIdentifier?: string;
    parentPassword?: string;
    isExistingParentAccount?: boolean;
  } | null>(null);

  const [showStudentCreatedPassword, setShowStudentCreatedPassword] = useState(false);
  const [showParentCreatedPassword, setShowParentCreatedPassword] = useState(false);

  useEffect(() => {
    if (visible) {
      api.get(`/students/admission-prefix${batchId ? `?batchId=${batchId}` : ''}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setPrefixInfo(res.data.data);
          }
        })
        .catch(() => {});

      api.get('/academics/batches')
        .then((res) => {
          if (res.data?.success && res.data?.data?.batches) {
            setBatches(res.data.data.batches);
          }
        })
        .catch(() => {});
    } else {
      setAdmittedResult(null);
    }
  }, [visible, batchId]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast('Student first and last name are required.', 'error');
      return;
    }
    if (!parentFullName.trim()) {
      showToast('Parent / Guardian name is required.', 'error');
      return;
    }
    if (!parentPhone.trim()) {
      showToast('Parent / Guardian phone number is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/students', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentPhone: studentPhone.trim() || undefined,
        gender,
        dob: dob.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        batchId: batchId || undefined,
        subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
        notes: notes.trim() || undefined,
        parentFullName: parentFullName.trim(),
        parentRelationship,
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim() || undefined,
        parentInitialPassword: parentInitialPassword.trim() || undefined,
        parentCanReceiveSms,
      });

      if (res.data?.success) {
        const student = res.data.data.student;
        const studentCreds = res.data.data.studentCredentials;
        const parentCreds = res.data.data.parentCredentials;
        const admissionNum = res.data.data.admissionNumber || student.admissionNumber;

        setAdmittedResult({
          name: `${firstName.trim()} ${lastName.trim()}`,
          admissionNumber: admissionNum,
          studentIdentifier: studentCreds?.identifier || admissionNum,
          studentPassword: studentCreds?.temporaryPassword,
          parentIdentifier: parentCreds?.identifier || parentCreds?.phone,
          parentPassword: parentCreds?.temporaryPassword,
          isExistingParentAccount: parentCreds?.isExistingAccount,
        });

        showToast('Student admitted successfully!', 'success');
        onSuccess(student);

        // Reset inputs
        setFirstName('');
        setLastName('');
        setStudentPhone('');
        setDob('');
        setBloodGroup('');
        setBatchId('');
        setNotes('');
        setParentFullName('');
        setParentPhone('');
        setParentEmail('');
        setParentInitialPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to admit student', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sheetTitle}>New Student Admission</Text>
              <Text style={styles.sheetSub}>Enrolls student and creates parent credentials</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {admittedResult ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Admission Completed</Text>
              <Text style={styles.successName}>{admittedResult.name}</Text>

              <View style={styles.admissionNumberBox}>
                <Text style={styles.admissionNumberLabel}>ASSIGNED ADMISSION NUMBER</Text>
                <Text style={styles.admissionNumberText}>{admittedResult.admissionNumber}</Text>
              </View>

              {/* Student Login Credentials */}
              {admittedResult.studentIdentifier && (
                <View style={styles.credBox}>
                  <Text style={styles.credBoxHeader}>Student Login Credentials</Text>
                  <Text style={styles.credRow}>
                    <Text style={styles.credBold}>Login Username / ID: </Text>
                    <Text selectable={true} style={styles.credHighlight}>
                      {admittedResult.studentIdentifier}
                    </Text>
                  </Text>
                  {admittedResult.studentPassword && (
                    <View style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.credRow}>
                          <Text style={styles.credBold}>Initial Password: </Text>
                          <Text selectable={true} style={styles.credHighlight}>
                            {showStudentCreatedPassword ? admittedResult.studentPassword : '••••••••••••'}
                          </Text>
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowStudentCreatedPassword(!showStudentCreatedPassword)}
                          style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#EFEBE9', borderRadius: 6 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#4E342E' }}>
                            {showStudentCreatedPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <Text style={styles.credSecurity}>
                    Student must change temporary password upon first login.
                  </Text>
                </View>
              )}

              {/* Parent Login Credentials */}
              {admittedResult.parentIdentifier && (
                <View style={[styles.credBox, { borderColor: '#FFE082', backgroundColor: '#FFFDF5' }]}>
                  <Text style={[styles.credBoxHeader, { color: '#8D6E63' }]}>
                    Parent Portal Credentials
                  </Text>
                  <Text style={styles.credRow}>
                    <Text style={styles.credBold}>Login ID (Phone): </Text>
                    <Text selectable={true} style={styles.credHighlight}>
                      {admittedResult.parentIdentifier}
                    </Text>
                  </Text>
                  {admittedResult.isExistingParentAccount ? (
                    <Text style={[styles.credHint, { color: '#2E7D32', fontWeight: '600' }]}>
                      ✓ Linked to existing guardian account. Existing login password preserved.
                    </Text>
                  ) : admittedResult.parentPassword ? (
                    <View style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.credRow}>
                          <Text style={styles.credBold}>Initial Password: </Text>
                          <Text selectable={true} style={styles.credHighlight}>
                            {showParentCreatedPassword ? admittedResult.parentPassword : '••••••••••••'}
                          </Text>
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowParentCreatedPassword(!showParentCreatedPassword)}
                          style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#FFE082', borderRadius: 6 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#5D4037' }}>
                            {showParentCreatedPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                  <Text style={styles.credSecurity}>
                    {admittedResult.isExistingParentAccount
                      ? 'Parent can log in immediately with their existing password.'
                      : 'Parent must change password upon first login. Never share passwords insecurely.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setAdmittedResult(null);
                  onClose();
                }}
              >
                <Text style={styles.doneBtnText}>Done & Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Student Section */}
              <Text style={styles.sectionHeading}>Student Details</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Admission Number</Text>
                <View style={styles.autoField}>
                  <Text style={styles.autoFieldText}>
                    {prefixInfo ? `${prefixInfo.previewFormat} (7-char scheme)` : 'Auto-generated on save'}
                  </Text>
                  <Text style={styles.autoTag}>AUTO</Text>
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>First Name*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Aarav"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Last Name*</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Student Phone Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={studentPhone}
                  onChangeText={setStudentPhone}
                />
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                        onPress={() => setGender(g)}
                      >
                        <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                          {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Other'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Date of Birth (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2008-05-14"
                    value={dob}
                    onChangeText={setDob}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Blood Group</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. O+"
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                  />
                </View>
              </View>

              {/* Batch Enrollment */}
              {batches.length > 0 && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Select Batch</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.batchScroll}>
                    {batches.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.batchChip, batchId === b.id && styles.batchChipActive]}
                        onPress={() => {
                          setBatchId(batchId === b.id ? '' : b.id);
                          setSelectedSubjectIds([]);
                        }}
                      >
                        <Text style={[styles.batchChipText, batchId === b.id && styles.batchChipTextActive]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Subject Selection for Chosen Batch */}
              {(() => {
                const selectedBatch = batches.find((b) => b.id === batchId);
                const subjects = selectedBatch?.batchSubjects || [];
                if (!batchId || subjects.length === 0) return null;
                return (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Allocate Batch Subjects (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.batchScroll}>
                      {subjects.map((bs: any) => {
                        const isSelected = selectedSubjectIds.includes(bs.subject.id);
                        return (
                          <TouchableOpacity
                            key={bs.subject.id}
                            style={[styles.batchChip, isSelected && styles.batchChipActive]}
                            onPress={() => {
                              setSelectedSubjectIds(
                                isSelected
                                  ? selectedSubjectIds.filter((id) => id !== bs.subject.id)
                                  : [...selectedSubjectIds, bs.subject.id]
                              );
                            }}
                          >
                            <Text style={[styles.batchChipText, isSelected && styles.batchChipTextActive]}>
                              {isSelected ? '✓ ' : ''}{bs.subject.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })()}

              {/* Parent Details Section */}
              <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Parent / Guardian Account</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Parent / Guardian Full Name*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Sharma"
                  value={parentFullName}
                  onChangeText={setParentFullName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Relationship to Student*</Text>
                <View style={styles.genderRow}>
                  {(['FATHER', 'MOTHER', 'GUARDIAN'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.genderBtn, parentRelationship === r && styles.genderBtnActive]}
                      onPress={() => setParentRelationship(r)}
                    >
                      <Text style={[styles.genderBtnText, parentRelationship === r && styles.genderBtnTextActive]}>
                        {r === 'FATHER' ? 'Father' : r === 'MOTHER' ? 'Mother' : 'Guardian'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Parent Phone Number* (Login Identifier)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={parentPhone}
                  onChangeText={setParentPhone}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Parent Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. parent@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={parentEmail}
                  onChangeText={setParentEmail}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Initial Parent Password (Optional)</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Leave blank to auto-generate"
                    secureTextEntry={!showPassword}
                    value={parentInitialPassword}
                    onChangeText={setParentInitialPassword}
                  />
                  <TouchableOpacity
                    style={styles.togglePassBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.togglePassText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setParentCanReceiveSms(!parentCanReceiveSms)}
              >
                <View style={[styles.checkbox, parentCanReceiveSms && styles.checkboxActive]}>
                  {parentCanReceiveSms && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Consent to receive institute in-app and push alerts</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Complete Admission</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '70%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  sheetSub: {
    fontSize: 12,
    color: '#6D4C41',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#8D6E63',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4E342E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE9',
    paddingBottom: 4,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4E342E',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#2D1E18',
  },
  autoField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFEBE9',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  autoFieldText: {
    fontSize: 12,
    color: '#6D4C41',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontWeight: 'bold',
  },
  autoTag: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#D7CCC8',
    color: '#3E2723',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  flexOne: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  genderBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D4C41',
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
  },
  batchScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  batchChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  batchChipActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  batchChipText: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '500',
  },
  batchChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  togglePassBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#EFEBE9',
    borderRadius: 10,
  },
  togglePassText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#8D6E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4E342E',
    borderColor: '#4E342E',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#4E342E',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#4E342E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#059669',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1E18',
  },
  successName: {
    fontSize: 13,
    color: '#6D4C41',
    marginTop: 2,
    marginBottom: 16,
  },
  admissionNumberBox: {
    width: '100%',
    backgroundColor: '#FAF7F2',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#BCAAA4',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  admissionNumberLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8D6E63',
    letterSpacing: 1,
  },
  admissionNumberText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4E342E',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    marginTop: 4,
  },
  credBox: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  credBoxHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  credRow: {
    fontSize: 12,
    color: '#1E293B',
    marginVertical: 2,
  },
  credBold: {
    fontWeight: 'bold',
    color: '#78350F',
  },
  credHighlight: {
    fontWeight: 'bold',
    color: '#065F46',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  credHint: {
    fontSize: 11,
    color: '#6D4C41',
    fontStyle: 'italic',
  },
  credSecurity: {
    fontSize: 10,
    color: '#78350F',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingTop: 6,
  },
  doneBtn: {
    backgroundColor: '#4E342E',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
