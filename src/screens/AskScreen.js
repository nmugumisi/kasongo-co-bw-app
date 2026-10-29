import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAiStatus, askAi } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { IconBack, IconSend, IconAi } from '../theme/zbsIcons';
import { niceDate } from '../utils/format';
import AiText from '../components/AiText';

const PROMPTS = [
  'Which items were short most this week?',
  'Compare this week with last week',
  'Are any items short on the same weekday every week?',
  'Were any sheets corrected after closing this month?',
  'What did staff note about breakages this month?',
];
const SHEET_PROMPTS = [
  'Why is this sheet short?',
  'Which shortages also happened in the last few weeks?',
  'Could a delivery be missing from this sheet?',
];

export default function AskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { settings } = useAuth();
  const isOnline = useNetworkStatus();
  const sheetId = route.params?.sheetId;
  const sheetDate = route.params?.date;

  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [messages, setMessages] = useState([]); // { role, content, sheets?, error? }
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const busyRef = useRef(false);
  const styles = makeStyles(c);

  useEffect(() => {
    getAiStatus()
      .then(setStatus)
      .catch((e) => setStatusError(e.message || 'Could not reach the server.'));
  }, []);

  async function send(text) {
    const q = (text ?? input).trim();
    if (busyRef.current || q.length < 3) return;
    busyRef.current = true;
    setBusy(true);
    setInput('');
    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    try {
      // Failed turns stay on screen but aren't sent back to the AI.
      const history = next.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
      const d = await askAi({ messages: history.slice(-10), sheet_id: sheetId });
      setMessages([...next, { role: 'assistant', content: d.answer, sheets: d.sheets }]);
      if (d.status) setStatus(d.status);
    } catch (e) {
      setMessages([...next.slice(0, -1), { role: 'user', content: q, error: true }, { role: 'assistant', content: e.message || 'Something went wrong. Please try again.', error: true }]);
      getAiStatus().then(setStatus).catch(() => {});
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const blocked = status && (!status.enabled || status.budget_reached || status.daily_remaining < 1);
  const canSend = isOnline && status && !blocked && !busy;
  const prompts = sheetId ? [...SHEET_PROMPTS, ...PROMPTS.slice(0, 2)] : PROMPTS;

  function renderEmpty() {
    if (!status) {
      return statusError ? <Text style={styles.error}>{statusError}</Text> : <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />;
    }
    if (!status.enabled) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The AI assistant isn't set up yet</Text>
          <Text style={styles.cardText}>
            An admin can switch it on in wp-admin under Bar Stock › AI Assistant by adding an OpenRouter key.
          </Text>
        </View>
      );
    }
    return (
      <View>
        <View style={styles.intro}>
          <IconAi size={22} color={c.accent} />
          <Text style={styles.introText}>
            Ask about stock, shortages, deliveries, corrections and staff notes. Answers come only from {settings.bar_name}'s sheets.
          </Text>
        </View>
        <Text style={styles.hint}>Try one of these</Text>
        {prompts.map((p) => (
          <TouchableOpacity key={p} style={styles.prompt} onPress={() => send(p)} disabled={!canSend}>
            <Text style={styles.promptText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <IconBack size={20} color={c.text} />
          </TouchableOpacity>
          <View style={styles.titleCol}>
            <Text style={styles.titleStrong}>Ask AI</Text>
            <Text style={styles.titleSmall} numberOfLines={1}>
              {sheetDate ? `About the sheet for ${niceDate(sheetDate)}` : settings.bar_name}
            </Text>
          </View>
          {messages.length ? (
            <TouchableOpacity style={styles.newBtn} onPress={() => setMessages([])} disabled={busy}>
              <Text style={styles.newBtnText}>New chat</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.main}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {!messages.length
            ? renderEmpty()
            : messages.map((m, i) =>
                m.role === 'user' ? (
                  <View key={i} style={[styles.userBubble, m.error && styles.failed]}>
                    <Text style={styles.userText}>{m.content}</Text>
                  </View>
                ) : (
                  <View key={i} style={styles.aiBlock}>
                    {m.error ? <Text style={styles.error}>{m.content}</Text> : <AiText text={m.content} />}
                    {m.sheets?.length ? (
                      <View style={styles.chips}>
                        {m.sheets.map((s) => (
                          <TouchableOpacity key={s.id} style={styles.chip} onPress={() => navigation.navigate('Review', { sheetId: s.id })}>
                            <Text style={styles.chipText}>{niceDate(s.date)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                )
              )}
          {busy ? (
            <View style={styles.thinking}>
              <ActivityIndicator size="small" color={c.accent} />
              <Text style={styles.muted}>Checking the sheets…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          {!isOnline ? (
            <Text style={styles.quota}>You're offline. Asking needs a connection.</Text>
          ) : status?.enabled ? (
            <Text style={styles.quota}>
              {status.budget_reached
                ? "This month's AI limit has been reached."
                : `${status.daily_remaining} question${status.daily_remaining === 1 ? '' : 's'} left today · ${status.model}`}
            </Text>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              maxLength={600}
              placeholder="Ask about stock, shortages or notes"
              placeholderTextColor={c.muted}
              multiline
              editable={!!canSend || busy}
            />
            <TouchableOpacity
              style={[styles.send, { backgroundColor: c.accent }, (!canSend || input.trim().length < 3) && styles.disabled]}
              onPress={() => send()}
              disabled={!canSend || input.trim().length < 3}
              accessibilityLabel="Send"
            >
              <IconSend size={20} color={c.accentInk} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
    iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    newBtn: { height: 42, paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    newBtnText: { fontSize: 14, fontWeight: '600', color: c.text },
    main: { padding: 14, paddingBottom: 24 },
    intro: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, marginBottom: 18 },
    introText: { flex: 1, fontSize: 14, color: c.text, lineHeight: 20 },
    hint: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginBottom: 10, marginHorizontal: 2 },
    prompt: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
    promptText: { fontSize: 14, color: c.text },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 16, marginTop: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    cardText: { fontSize: 14, color: c.muted, lineHeight: 20 },
    userBubble: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: c.accent, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
    userText: { fontSize: 14.5, color: c.accentInk, lineHeight: 20 },
    failed: { opacity: 0.6 },
    aiBlock: { alignSelf: 'stretch', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, marginBottom: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.card2 },
    chipText: { fontSize: 12, fontWeight: '600', color: c.text },
    thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    muted: { fontSize: 13, color: c.muted },
    error: { fontSize: 14, color: c.neg, lineHeight: 20 },
    footer: { paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
    quota: { fontSize: 12, color: c.muted, marginBottom: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
    send: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    disabled: { opacity: 0.5 },
  });
}
