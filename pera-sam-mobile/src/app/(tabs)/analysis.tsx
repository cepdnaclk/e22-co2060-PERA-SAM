import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  createAudioPlayer,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../lib/AuthContext';
import { useThemeContext } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { getMlApiConfigError, getMlApiErrorMessage, mlApiUrl } from '../../lib/mlApi';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
  MachineCategories,
  StatusConfig,
  AnalysisStatus,
} from '../../constants/theme';
import { StepBadge, useScalePress, usePulse } from '../../components/AnimatedUI';
import { ThemeToggle } from '../../components/ThemeToggle';

// ── MIME type helper ──────────────────────────────────────────────────────────
function mimeTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    wav: 'audio/wav',
    wave: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/m4a',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    webm: 'audio/webm',
    caf: 'audio/x-caf',
  };
  return map[ext] ?? 'audio/wav';
}


type AnalysisResult = {
  status: AnalysisStatus;
  confidence: number;
  anomaly_score: number;
  category: string;
  machine_id: string;
  recommendation: string;
};

type AudioInput = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  source: 'file' | 'recording';
};

export default function AnalysisScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useThemeContext();
  const { t } = useLanguage();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [audioFile, setAudioFile] = useState<AudioInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const { animatedStyle: analyzeBtnAnim, onPressIn: analyzeIn, onPressOut: analyzeOut } = useScalePress();
  const { animatedStyle: saveBtnAnim, onPressIn: saveIn, onPressOut: saveOut } = useScalePress();
  const isRecording = audioRecorderState.isRecording;
  const pulseStyle = usePulse(isRecording);

  // ── Cleanup audio player on unmount ────────────────────────────────────────
  const cleanupPlayer = () => {
    if (playerRef.current) {
      try { playerRef.current.remove(); } catch {}
      playerRef.current = null;
    }
    setIsPlaying(false);
  };

  // ── Toggle playback preview ────────────────────────────────────────────────
  async function togglePlayback() {
    if (!audioFile) return;
    try {
      if (playerRef.current && isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
        return;
      }
      // Create a fresh player each time play starts
      cleanupPlayer();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri: audioFile.uri });
      playerRef.current = player;
      player.play();
      setIsPlaying(true);
      // Poll playing state to detect natural end (every 500ms)
      const interval = setInterval(() => {
        if (!player.playing) {
          setIsPlaying(false);
          clearInterval(interval);
        }
      }, 500);
    } catch {
      setIsPlaying(false);
      Alert.alert('Playback Error', 'Could not play this audio file on your device.');
    }
  }

  async function pickAudio() {
    cleanupPlayer();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets.length > 0) {
        const asset = res.assets[0];
        const name = asset.name || 'audio.wav';
        // Prefer the picker-reported MIME; fall back to extension-based detection
        const mimeType = (asset.mimeType && asset.mimeType !== 'application/octet-stream')
          ? asset.mimeType
          : mimeTypeFromName(name);
        setAudioFile({
          uri: asset.uri,
          name,
          mimeType,
          size: asset.size,
          source: 'file',
        });
        setResult(null);

      }
    } catch {
      Alert.alert('Error', 'Could not pick audio file.');
    }
  }

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone Needed', 'Please allow microphone access to record equipment audio.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setResult(null);
    } catch {
      Alert.alert('Recording Failed', 'Could not start recording on this device.');
    }
  }

  async function stopRecording() {
    if (!audioRecorderState.isRecording) return;

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert('Recording Failed', 'No recording file was created.');
        return;
      }

      setAudioFile({
        uri,
        name: `pera-sam-recording-${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
        source: 'recording',
      });
    } catch {
      Alert.alert('Recording Failed', 'Could not save the recording.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false });
    }
  }

  async function analyzeAudio() {
    if (!audioFile) {
      Alert.alert('No Audio File', 'Please select or record an audio file first.');
      return;
    }

    const configError = getMlApiConfigError();
    if (configError) {
      Alert.alert('ML Backend Setup Needed', configError);
      return;
    }

    // Soft warning if no category is selected (still allow analysis)
    if (!selectedCategory) {
      await new Promise<void>((resolve) =>
        Alert.alert(
          'No Category Selected',
          'Selecting an equipment category improves accuracy. Continue without one?',
          [
            { text: 'Select Category', style: 'cancel', onPress: () => resolve() },
            { text: 'Continue Anyway', onPress: () => resolve() },
          ]
        )
      );
      // Check again in case they cancelled
      if (!audioFile) return;
    }

    // Stop playback before sending
    cleanupPlayer();
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res = await fetch(audioFile.uri);
        const blob = await res.blob();
        const file = new File([blob], audioFile.name || 'audio.wav', {
          type: audioFile.mimeType,
        });
        formData.append('file', file);
      } else {
        // React Native native fetch FormData file object
        formData.append('file', {
          uri: audioFile.uri,
          type: audioFile.mimeType,
          name: audioFile.name || 'audio.wav',
        } as any);
      }

      if (selectedCategory) {
        formData.append('category', selectedCategory);
      }

      const response = await fetch(`${mlApiUrl}/analyze`, {
        method: 'POST',
        // Do NOT set Content-Type manually — let fetch set multipart/form-data boundary
        body: formData,
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server returned status ${response.status} with non-JSON body.`);
      }

      if (!response.ok || data.status === 'Error' || data.analysis?.status === 'Error' || data.analysis?.status === 'No Model') {
        const msg = data.detail || data.message || data.analysis?.message || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const rawStatus = String(data.analysis?.status || data.status || '').toLowerCase();
      const status: AnalysisStatus = rawStatus === 'anomaly' || rawStatus === 'abnormal'
        ? 'abnormal'
        : rawStatus === 'warning'
          ? 'warning'
          : 'normal';

      const analysisResult: AnalysisResult = {
        status,
        confidence: Number(data.analysis?.health_percentage ?? data.health_percentage ?? 0),
        anomaly_score: Number(data.analysis?.score ?? data.anomaly_score ?? 0),
        category: data.analysis?.machine_category ?? data.category ?? selectedCategory ?? 'unknown',
        machine_id: data.analysis?.machine_id ?? data.machine_id ?? 'N/A',
        recommendation: data.recommendation || data.analysis?.recommendation || 'No recommendation available.',
      };

      setResult(analysisResult);
    } catch (error) {
      Alert.alert('Analysis Failed', getMlApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveToHistory() {
    if (!result || !user) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('analysis_results').insert({
        user_id: user.id,
        category: result.category,
        status: result.status,
        confidence: result.confidence,
        anomaly_score: result.anomaly_score,
        machine_id: result.machine_id,
        recommendation: result.recommendation,
        details: { filename: audioFile?.name || 'unknown' },
      });

      if (error) throw error;
      Alert.alert('Saved', 'Analysis saved to your history.', [
        { text: 'View History', onPress: () => router.push('/(tabs)/history' as any) },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save to database.');
    }
    setSaving(false);
  }

  function resetAnalysis() {
    cleanupPlayer();
    setAudioFile(null);
    setResult(null);
    setSelectedCategory('');
  }

  const statusCfg = result ? StatusConfig[result.status] : null;
  const recordingDuration = Math.max(0, Math.floor(audioRecorderState.durationMillis / 1000));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { backgroundColor: colors.card }]}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.accent }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, opacity: 0.5 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="mic" size={18} color={BrandColors.white} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Audio Analysis</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          {result && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetAnalysis}>
              <Ionicons name="refresh" size={16} color={BrandColors.indigo} />
              <Text style={styles.resetText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!result ? (
          <>
            {/* Step 1: Select Category */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.stepRow}>
              <StepBadge number={1} color={BrandColors.orange} />
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select Equipment Type</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.categoryGrid}>
              {MachineCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedCategory === cat.value && [styles.categoryCardActive, { borderColor: cat.color, backgroundColor: cat.bg }],
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: selectedCategory === cat.value ? cat.color + '20' : (isDark ? colors.background : BrandColors.muted) }]}>
                    <Ionicons
                      name={cat.icon as any}
                      size={22}
                      color={selectedCategory === cat.value ? cat.color : colors.mutedForeground}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: colors.foreground },
                      selectedCategory === cat.value && { color: cat.color, fontWeight: '700' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Step 2: Capture Audio */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.stepRow}>
              <StepBadge number={2} color={BrandColors.blue} />
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Capture or Upload Audio</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <TouchableOpacity
                style={[
                  styles.uploadZone,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  audioFile && [styles.uploadZoneActive, { borderColor: BrandColors.indigo }],
                ]}
                onPress={pickAudio}
                activeOpacity={0.7}
              >
                {audioFile ? (
                  <View style={styles.fileInfo}>
                    <View style={styles.fileIconWrap}>
                      <Ionicons name="musical-notes" size={26} color={BrandColors.indigo} />
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                        {audioFile.name}
                      </Text>
                      <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
                        {audioFile.source === 'recording'
                          ? `🎙 Recorded • ${audioFile.mimeType}`
                          : audioFile.size
                          ? `${(audioFile.size / 1024).toFixed(1)} KB • ${audioFile.mimeType}`
                          : audioFile.mimeType}
                      </Text>
                    </View>
                    {/* Play/Pause preview button */}
                    <TouchableOpacity
                      style={[styles.playBtn, { backgroundColor: BrandColors.indigo + '15' }]}
                      onPress={(e) => { e.stopPropagation?.(); togglePlayback(); }}
                    >
                      <Ionicons
                        name={isPlaying ? 'pause-circle' : 'play-circle'}
                        size={28}
                        color={BrandColors.indigo}
                      />
                    </TouchableOpacity>
                    {/* Swap file */}
                    <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); pickAudio(); }}>
                      <Ionicons name="swap-horizontal" size={20} color={BrandColors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={[styles.uploadIconCircle, isDark && { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <Ionicons name="cloud-upload-outline" size={32} color={BrandColors.indigo} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: colors.foreground }]}>{t('noAudioSelected') || 'Tap to select audio file'}</Text>
                    <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>WAV, MP3, M4A, OGG, FLAC supported</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(500)} style={isRecording ? pulseStyle : undefined}>
              <TouchableOpacity
                style={[
                  styles.recordBtn,
                  { backgroundColor: colors.card },
                  isRecording && styles.recordBtnActive,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isRecording ? 'stop-circle' : 'radio-button-on'}
                  size={20}
                  color={isRecording ? BrandColors.white : BrandColors.rose}
                />
                <Text style={[styles.recordBtnText, isRecording && styles.recordBtnTextActive]}>
                  {isRecording
                    ? `${t('stopRecording') || 'Stop Recording'} (${recordingDuration}s)`
                    : (t('recordAudio') || 'Record Audio with Microphone')}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Step 3: Analyze */}
            <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.stepRow}>
              <StepBadge number={3} color={BrandColors.emerald} />
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Analyze</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(500).delay(700)}>
              <Animated.View style={analyzeBtnAnim}>
                <TouchableOpacity
                  style={[
                    styles.analyzeBtn,
                    (!audioFile || loading) && styles.analyzeBtnDisabled,
                  ]}
                  onPress={analyzeAudio}
                  onPressIn={analyzeIn}
                  onPressOut={analyzeOut}
                  disabled={!audioFile || loading || isRecording}
                  activeOpacity={0.9}
                >
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.analyzeBtnText}>Analyzing...</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="analytics" size={20} color={BrandColors.white} />
                      <Text style={styles.analyzeBtnText}>Analyze Audio</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Loading overlay hint */}
            {loading && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.loadingHint}>
                <Ionicons name="sparkles" size={16} color={BrandColors.purple} />
                <Text style={styles.loadingHintText}>
                  Processing audio through ML model. This may take a moment...
                </Text>
              </Animated.View>
            )}
          </>
        ) : (
          /* Results */
          <>
            {/* Status Hero */}
            <Animated.View entering={FadeInDown.duration(600).delay(100)}>
              <View style={[styles.resultHero, { backgroundColor: statusCfg?.bg }]}>
                <View style={[styles.resultIconCircle, { backgroundColor: statusCfg?.color }]}>
                  <Ionicons name={statusCfg?.icon as any} size={42} color={BrandColors.white} />
                </View>
                <Text style={[styles.resultStatus, { color: statusCfg?.color }]}>
                  {statusCfg?.label}
                </Text>
                <Text style={styles.resultMachine}>
                  {result.category.charAt(0).toUpperCase() + result.category.slice(1)} — {result.machine_id}
                </Text>
              </View>
            </Animated.View>

            {/* Scores */}
            <Animated.View entering={FadeInDown.duration(500).delay(250)} style={styles.scoresRow}>
              <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.scoreValue, { color: BrandColors.indigo }]}>{result.confidence.toFixed(1)}%</Text>
                <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Health Score</Text>
              </View>
              <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.scoreValue, { color: BrandColors.purple }]}>{result.anomaly_score.toFixed(3)}</Text>
                <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Anomaly Score</Text>
              </View>
            </Animated.View>

            {/* Recommendation */}
            <Animated.View entering={FadeInDown.duration(500).delay(400)} style={[styles.recoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.recoHeader}>
                <View style={styles.recoIconBg}>
                  <Ionicons name="bulb" size={18} color={BrandColors.amber} />
                </View>
                <Text style={[styles.recoTitle, { color: colors.foreground }]}>Recommendation</Text>
              </View>
              <Text style={[styles.recoText, { color: colors.mutedForeground }]}>{result.recommendation}</Text>
            </Animated.View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.duration(500).delay(550)} style={styles.resultActions}>
              <Animated.View style={saveBtnAnim}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveToHistory}
                  onPressIn={saveIn}
                  onPressOut={saveOut}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="bookmark" size={18} color={BrandColors.white} />
                      <Text style={styles.saveBtnText}>Save to History</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={[styles.newBtn, { backgroundColor: colors.card }]} onPress={resetAnalysis}>
                <Ionicons name="add-circle-outline" size={18} color={BrandColors.indigo} />
                <Text style={styles.newBtnText}>New Analysis</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.white,
    ...Shadows.sm,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BrandColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: BrandColors.indigoLight,
    borderRadius: BorderRadius.full,
  },
  resetText: { ...Typography.caption, color: BrandColors.indigo, fontWeight: '700' },

  scroll: { padding: 20, paddingBottom: 100 },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  stepTitle: {
    ...Typography.h3,
    color: BrandColors.foreground,
  },

  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  categoryCardActive: {
    ...Shadows.md,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    ...Typography.label,
    color: BrandColors.foreground,
  },

  // Upload
  uploadZone: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: BrandColors.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadZoneActive: {
    borderColor: BrandColors.indigo,
    borderStyle: 'solid',
    padding: 16,
  },
  uploadIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadTitle: { ...Typography.label, color: BrandColors.foreground, marginBottom: 4 },
  uploadHint: { ...Typography.caption, color: BrandColors.mutedForeground },

  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  fileIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: { flex: 1 },
  fileName: { ...Typography.label, color: BrandColors.foreground },
  fileSize: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2 },

  // Recording
  recordBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: BrandColors.rose,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  recordBtnActive: {
    backgroundColor: BrandColors.rose,
    borderColor: BrandColors.rose,
    ...Shadows.glow(BrandColors.rose),
  },
  recordBtnText: {
    ...Typography.button,
    color: BrandColors.rose,
  },
  recordBtnTextActive: {
    color: BrandColors.white,
  },

  // Analyze button
  analyzeBtn: {
    flexDirection: 'row',
    height: 58,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { ...Typography.button, color: BrandColors.white, fontSize: 17, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  loadingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    backgroundColor: BrandColors.purpleLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  loadingHintText: { ...Typography.caption, color: BrandColors.purpleDark, flex: 1 },

  // Results
  resultHero: {
    borderRadius: BorderRadius.xl,
    padding: 36,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultStatus: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  resultMachine: {
    ...Typography.body,
    color: BrandColors.mutedForeground,
  },

  scoresRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  scoreCard: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    padding: 22,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  scoreValue: {
    ...Typography.bigNumber,
    fontSize: 28,
  },
  scoreLabel: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 4, fontWeight: '500' },

  recoCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 22,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  recoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  recoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BrandColors.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoTitle: { ...Typography.label, color: BrandColors.foreground },
  recoText: { ...Typography.body, color: BrandColors.mutedForeground, lineHeight: 22 },

  resultActions: { gap: 12 },
  saveBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  saveBtnText: { ...Typography.button, color: BrandColors.white, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: BrandColors.indigo,
  },
  newBtnText: { ...Typography.button, color: BrandColors.indigo, fontWeight: '700' },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
