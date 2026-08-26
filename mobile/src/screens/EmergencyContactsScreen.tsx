import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform
} from 'react-native';
import { UserPlus, Phone, ShieldCheck, Trash2, Edit3, Lock, Users, AlertCircle, BellRing, Smartphone } from 'lucide-react-native';
import { theme } from '../theme/theme';
import { EmergencyContact, RelationshipType } from '../types/emergency';
import { emergencyApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/storage';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { ScreenHeader } from '../components/ScreenHeader';

const RELATIONSHIPS: (RelationshipType | string)[] = [
  'Family',
  'Friend',
  'Medical',
  'Local Authority',
  'Neighbor',
  'Colleague',
  'Other'
];

export const EmergencyContactsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string>('');
  const [maskData, setMaskData] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registeringPush, setRegisteringPush] = useState<boolean>(false);
  const [responderPhone, setResponderPhone] = useState<string>('');
  const [pairingCodeInput, setPairingCodeInput] = useState<string>('');
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Family');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [maskData]);

  const init = async () => {
    setLoading(true);
    try {
      const devId = await getOrCreateDeviceId();
      setDeviceId(devId);
      const data = await emergencyApi.listContacts(devId, maskData);
      setContacts(data);

      const registeredTokens = await emergencyApi.listRegisteredDevices(devId);
      if (registeredTokens.length > 0) {
        setPushToken(registeredTokens[0].push_token);
      }
    } catch (e: any) {
      Alert.alert('Connection Error', e.message || 'Unable to connect to emergency server.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePushReceiver = async () => {
    if (!responderPhone.trim()) {
      Alert.alert('Phone Number Required', 'Please enter your phone number to receive SOS alerts.');
      return;
    }
    setRegisteringPush(true);
    try {
      const token = await registerForPushNotificationsAsync(responderPhone.trim());
      if (token) {
        setPushToken(token);
        Alert.alert(
          'Push Receiver Active',
          'This device is now registered to receive real emergency SOS push notifications.'
        );
      } else {
        Alert.alert('Permission Required', 'Notification permissions were not granted.');
      }
    } catch (e: any) {
      Alert.alert('Registration Error', e.message || 'Could not register push token.');
    } finally {
      setRegisteringPush(false);
    }
  };

  const handleVerifyPairingCode = async () => {
    if (!pairingCodeInput.trim()) {
      Alert.alert('Verification Code Required', 'Please enter a 6-character pairing code.');
      return;
    }
    setPairingLoading(true);
    try {
      const devId = await getOrCreateDeviceId();
      await emergencyApi.pairContact(devId, pairingCodeInput.trim().toUpperCase());
      setPairingCodeInput('');
      Alert.alert(
        'Pairing Successful',
        'You have successfully paired this device as an emergency contact responder.'
      );
      await init();
    } catch (e: any) {
      Alert.alert('Pairing Error', e.message || 'Failed to verify pairing code.');
    } finally {
      setPairingLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhone('');
    setRelationship('Family');
    setIsPrimary(false);
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone_number);
    setRelationship(contact.relationship);
    setIsPrimary(contact.is_primary);
    setFormError(null);
    setModalVisible(true);
  };

  const validateInput = (): boolean => {
    if (name.trim().length < 2) {
      setFormError('Contact name must be at least 2 characters.');
      return false;
    }
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+[1-9]\d{6,14}|[6-9]\d{9})$/;
    if (!phoneRegex.test(cleanPhone)) {
      setFormError('Enter a valid 10-digit Indian mobile number or international E.164 (+CountryCode).');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSaveContact = async () => {
    if (!validateInput()) return;

    setSubmitting(true);
    try {
      if (editingContact) {
        await emergencyApi.updateContact(
          editingContact.id,
          {
            name: name.trim(),
            phone_number: phone.trim(),
            relationship,
            is_primary: isPrimary
          },
          deviceId
        );
      } else {
        await emergencyApi.addContact({
          device_id: deviceId,
          name: name.trim(),
          phone_number: phone.trim(),
          relationship,
          is_primary: isPrimary
        });
      }
      setModalVisible(false);
      await init();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save contact.');
    } finally {
      setSubmitting(false);
    }
  };

  
  const handleTestAlert = async (contactId: string) => {
    try {
      Alert.alert(
        'Test Alert',
        'Send a test connectivity SMS to this contact? No emergency event will be created.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Test SMS',
            onPress: async () => {
              try {
                await emergencyApi.testEmergencyContact(contactId, deviceId);
                Alert.alert('Success', 'Test SMS request dispatched to provider.');
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteContact = (contactId: string, contactName: string) => {
    Alert.alert(
      'Delete Emergency Contact',
      `Are you sure you want to remove ${contactName} from your emergency SOS list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyApi.deleteContact(contactId, deviceId);
              await init();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete contact.');
            }
          }
        }
      ]
    );
  };

  const renderContactCard = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.is_primary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>PRIMARY</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
            <Edit3 size={16} color="#60a5fa" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteContact(item.id, item.name)} style={styles.actionBtn}>
            <Trash2 size={16} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardInfoRow}>
        <Phone size={14} color="#94a3b8" />
        <Text style={styles.phoneText}>{item.phone_number}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.relationshipTag}>
          <Text style={styles.relationshipText}>{item.relationship}</Text>
        </View>
        <View style={styles.verifiedBadge}>
          {item.is_verified ? (
            <Text style={[styles.verifiedText, { color: '#22c55e' }]}>STATUS: VERIFIED</Text>
          ) : (
            <Text style={[styles.verifiedText, { color: '#f59e0b' }]}>STATUS: REGISTERED (NOT VERIFIED)</Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={{ marginTop: 12, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, alignItems: 'center' }}
        onPress={() => handleTestAlert(item.id)}
      >
        <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>[ SEND TEST ALERT ]</Text>
      </TouchableOpacity>

    </View>
  );

  return (
    <View style={styles.container}>
      {onBack ? (
        <ScreenHeader
          title="Contacts"
          onBack={onBack}
          rightAction={
            <TouchableOpacity onPress={openAddModal}>
              <UserPlus size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
      ) : (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Emergency Contacts</Text>
            <Text style={styles.headerSubtitle}>Notified automatically when SOS is activated</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <UserPlus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Responder Push Receiver Status Card */}
      <View style={styles.responderCard}>
        <View style={styles.responderCardLeft}>
          <Smartphone size={18} color={pushToken ? '#22c55e' : '#f59e0b'} />
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.responderCardTitle}>
              {pushToken ? 'RESPONDER PUSH ACTIVE' : 'ENABLE RESPONDER PUSH'}
            </Text>
            <Text style={styles.responderCardSub}>
              {pushToken
                ? 'This device is ready to receive real SOS push notifications.'
                : 'Register device token to receive real push alerts as a responder.'}
            </Text>
            {!pushToken && (
              <TextInput
                style={{ backgroundColor: '#1e293b', color: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 8, fontSize: 12, borderWidth: 1, borderColor: '#334155' }}
                placeholder="Enter your phone number..."
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={responderPhone}
                onChangeText={setResponderPhone}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            )}
          </View>
        </View>
        {pushToken ? (
          <TouchableOpacity
            style={[styles.enablePushBtn, { backgroundColor: '#7f1d1d', borderColor: '#450a0a' }]}
            onPress={() => setPushToken(null)}
          >
            <Text style={styles.enablePushBtnText}>Reset</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.enablePushBtn}
            onPress={handleEnablePushReceiver}
            disabled={registeringPush}
          >
            {registeringPush ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enablePushBtnText}>Activate</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Pairing Code Verification Form (Phone B responder) */}
      {pushToken && (
        <View style={[styles.responderCard, { marginTop: 12, backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.responderCardTitle}>LINK EMERGENCY CONTACT</Text>
            <Text style={styles.responderCardSub}>
              Enter the pairing code shown on your friend's device to link this installation.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
              <TextInput
                style={{
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: '#334155',
                  flex: 2,
                  textTransform: 'uppercase'
                }}
                placeholder="e.g. 1A2B3C"
                placeholderTextColor="#64748b"
                value={pairingCodeInput}
                onChangeText={setPairingCodeInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 6,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 1
                }}
                onPress={handleVerifyPairingCode}
                disabled={pairingLoading}
              >
                {pairingLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Privacy masking toggle */}
      <View style={styles.privacyRow}>
        <View style={styles.privacyLabelRow}>
          <Lock size={14} color="#94a3b8" />
          <Text style={styles.privacyLabel}>Mask Sensitive Phone Numbers</Text>
        </View>
        <Switch
          value={maskData}
          onValueChange={setMaskData}
          thumbColor={maskData ? '#3b82f6' : '#64748b'}
          trackColor={{ false: '#334155', true: '#1e3a8a' }}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading emergency contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No Emergency Contacts Registered</Text>
          <Text style={styles.emptyText}>
            Add trusted contacts, family members, or local disaster responders to receive SOS alerts.
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
            <Text style={styles.emptyAddBtnText}>Add First Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactCard}
          contentContainerStyle={styles.listContent}
          onRefresh={init}
          refreshing={loading}
        />
      )}

      {/* Add / Edit Contact Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingContact ? 'Edit Emergency Contact' : 'Register Emergency Contact'}
            </Text>

            {formError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color="#ef4444" />
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Ananya Sharma"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.inputLabel}>Phone Number (Indian 10-digit or +E.164)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210 or +919876543210"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relScroll}>
              {RELATIONSHIPS.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.relOption, relationship === rel && styles.relOptionSelected]}
                  onPress={() => setRelationship(rel)}
                >
                  <Text style={[styles.relOptionText, relationship === rel && styles.relOptionTextSelected]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.primarySwitchRow}>
              <Text style={styles.primarySwitchLabel}>Set as Primary SOS Contact</Text>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                thumbColor={isPrimary ? '#3b82f6' : '#64748b'}
                trackColor={{ false: '#334155', true: '#1e3a8a' }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveContact}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingContact ? 'Save Changes' : 'Register'}</Text>
                )}
              </TouchableOpacity>
            </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13
  },
  responderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#082f49',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0284c7'
  },
  responderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  responderCardTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700'
  },
  responderCardSub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 1
  },
  enablePushBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  enablePushBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  privacyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  privacyLabel: {
    color: '#94a3b8',
    fontSize: 12
  },
  listContent: {
    paddingBottom: 24
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9'
  },
  primaryBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  primaryBadgeText: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '700'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionBtn: {
    padding: 4
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8
  },
  phoneText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'monospace'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  relationshipTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  relationshipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verifiedText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  emptyAddBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16
  },
  emptyAddBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#450a0a',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#991b1b'
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  relScroll: {
    flexDirection: 'row',
    marginVertical: 6
  },
  relOption: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  relOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6'
  },
  relOptionText: {
    color: '#94a3b8',
    fontSize: 12
  },
  relOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600'
  },
  primarySwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  primarySwitchLabel: {
    color: '#cbd5e1',
    fontSize: 13
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  }
});
