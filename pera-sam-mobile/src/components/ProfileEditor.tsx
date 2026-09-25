import React, { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useAppTheme } from '../lib/ThemeContext';
import { TranslationKey, useLanguage } from '../lib/i18n';
import { validateProfile } from '../lib/profile';
import { MotionButton } from './AnimatedUI';

export function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const phoneInput = useRef<TextInput>(null);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [hasError, setHasError] = useState(false);
  const savedName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const savedPhone = user?.user_metadata?.contact_phone || '';
  const dirty = name.trim() !== savedName || phone.trim() !== savedPhone;

  const startEditing = () => {
    setName(savedName);
    setPhone(savedPhone);
    setMessage(null);
    setHasError(false);
    setEditing(true);
  };

  const save = async () => {
    if (savingRef.current || !dirty) return;
    const validation = validateProfile(name, phone);
    if (validation) {
      setMessage(validation);
      setHasError(true);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(name.trim(), phone.trim());
      Keyboard.dismiss();
      setEditing(false);
      setHasError(false);
      setMessage(user?.id === 'demo-user-123' ? 'profileDemoSaved' : 'profileSaved');
    } catch {
      setHasError(true);
      setMessage('profileSaveFailed');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.foreground, backgroundColor: colors.inputBg, borderColor: colors.border }];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.foreground }]}>{t('profileDetails')}</Text>
        {!editing && <MotionButton accessibilityLabel={t('editProfile')} style={[styles.editButton, { backgroundColor: colors.badgeBg }]} onPress={startEditing} disabled={!user}>
          <Ionicons name="create-outline" size={17} color={colors.indigo} />
          <Text style={{ color: colors.indigo, fontWeight: '600' }}>{t('editProfile')}</Text>
        </MotionButton>}
      </View>
      {editing ? (
        <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('profileFullName')}</Text>
          <TextInput accessibilityLabel={t('profileFullName')} value={name} onChangeText={setName} style={inputStyle}
            editable={!saving} maxLength={80} autoCapitalize="words" autoComplete="name" returnKeyType="next"
            onSubmitEditing={() => phoneInput.current?.focus()} />
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('profileContactPhone')}</Text>
          <TextInput ref={phoneInput} accessibilityLabel={t('profileContactPhone')} value={phone} onChangeText={setPhone}
            style={inputStyle} editable={!saving} maxLength={30} keyboardType="phone-pad" autoComplete="tel" />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('profilePhoneHint')}</Text>
        </Animated.View>
      ) : (
        <View style={styles.details}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('profileFullName')}</Text>
          <Text selectable style={{ color: colors.foreground }}>{savedName || '—'}</Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('profileContactPhone')}</Text>
          <Text selectable style={{ color: colors.foreground }}>{savedPhone || '—'}</Text>
        </View>
      )}
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('profileSignInEmail')}</Text>
      <Text selectable style={{ color: colors.foreground }}>{user?.email || '—'}</Text>
      {message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: hasError ? colors.rose : colors.emerald }]}>{t(message)}</Text>}
      {editing && <View style={styles.actions}>
        <MotionButton style={[styles.button, { borderWidth: 1, borderColor: colors.border }]} disabled={saving}
          onPress={() => { Keyboard.dismiss(); setEditing(false); setMessage(null); }}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>{t('cancel')}</Text>
        </MotionButton>
        <MotionButton style={[styles.button, { backgroundColor: colors.indigo, opacity: saving || !dirty ? 0.55 : 1 }]}
          disabled={saving || !dirty} accessibilityState={{ disabled: saving || !dirty, busy: saving }} onPress={save}>
          {saving ? <ActivityIndicator color="#fff" accessibilityLabel={t('profileSaving')} /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{t('save')}</Text>}
        </MotionButton>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, borderRadius: 20, marginBottom: 24 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heading: { fontSize: 17, fontWeight: '700' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
  details: { gap: 2 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 7 },
  feedback: { marginTop: 16, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, minHeight: 48, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
});
