import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, CapsLabel, CategoryIcon, Icon } from '@/components/ui';
import { Tx, dateLabel, fmt, fromKZT } from '@/lib/money';
import { smooth } from '@/lib/anim';
import { monthFlowKZT, netWorthKZT, useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts, categories, transactions, debts, assets, deleteTx, showToast, setSettings } = useFlow();
  const base = settings.baseCurrency;

  // Privacy mask for the hero amounts — eye button, or flip the phone face-down and back.
  const hidden = settings.hideNw ?? false;
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const toggleHidden = () => {
    smooth();
    setSettings({ hideNw: !hiddenRef.current });
  };
  useEffect(() => {
    Accelerometer.setUpdateInterval(250);
    // Orientation-agnostic flip detector: the first stable pose (screen toward the
    // user) sets the "up" sign of gravity on the z axis; entering the opposite pose
    // (face-down) and returning within 4s counts as one flip → toggle the mask.
    let upSign = 0, downAt = 0;
    const sub = Accelerometer.addListener(({ z }) => {
      if (Math.abs(z) < 0.6) return;
      const s = Math.sign(z);
      if (!upSign) { upSign = s; return; }
      if (s !== upSign) { downAt = Date.now(); return; }
      if (downAt && Date.now() - downAt < 4000) toggleHidden();
      downAt = 0;
    });
    return () => sub.remove();
  }, []);
  const mask = (s: string) => (hidden ? '••••••' : s);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initials = settings.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const nw = netWorthKZT(accounts, debts, assets);
  const nowKey = new Date().toISOString().slice(0, 7);
  const flow = monthFlowKZT(transactions, nowKey);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = [
    { label: 'In accounts', val: nw.cash, plus: true },
    { label: 'Property', val: nw.prop, plus: true },
    { label: 'Lent to others', val: nw.lent, plus: true },
    { label: 'Borrowed from others', val: nw.borrowed, plus: false },
    { label: 'Credit card debt', val: nw.credit, plus: false },
  ].filter(p => p.val > 0);

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const groups: { label: string; rows: Tx[] }[] = [];
  for (const tx of sorted) {
    const label = dateLabel(tx.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(tx);
    else groups.push({ label, rows: [tx] });
  }
  const cat = (id?: string | null) => categories.find(c => c.id === id);
  const acc = (id?: string | null) => accounts.find(a => a.id === id);

  // Tap a row → quick-info modal; the Edit button (or holding the row) opens the editor.
  const [infoTx, setInfoTx] = useState<Tx | null>(null);
  const infoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (infoTx) {
      infoAnim.setValue(0);
      Animated.spring(infoAnim, { toValue: 1, friction: 7, tension: 130, useNativeDriver: true }).start();
    }
  }, [infoTx]);
  const openEdit = (id: string) => { setInfoTx(null); router.push({ pathname: '/sheets/add-transaction', params: { id } }); };

  const confirmDelete = (tx: Tx) =>
    Alert.alert('Delete transaction?', 'Balances will be adjusted back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { smooth(); deleteTx(tx.id); showToast('Transaction removed'); } },
    ]);

  return (
    <>
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textMuted }}>{greeting}</Text>
          <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>{settings.name}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => ({
          width: 44, height: 44, borderRadius: 22, backgroundColor: t.accentSoft,
          alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }],
        })}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.accentDeep }}>{initials}</Text>
        </Pressable>
      </View>

      {/* Hero — theme ambient scenes: see design_handoff README ("Theme scenery"); add react-native-svg scenes here per theme. */}
      <View style={{ borderRadius: radius.xl, padding: 20, paddingVertical: 22, backgroundColor: t.heroA, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.onHero, opacity: 0.75 }}>Net worth</Text>
          <Pressable hitSlop={10} onPress={toggleHidden} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.8 })}>
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={19} color={t.onHero} />
          </Pressable>
        </View>
        <AmountText str={mask(fmt(fromKZT(nw.net, base), base))} color={t.onHero} size={34} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[
            { label: 'In this month', val: fmt(fromKZT(flow.inn, base), base, '+') },
            { label: 'Out this month', val: '−' + fmt(fromKZT(flow.out, base), base, false) },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, padding: 10 }}>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.onHero, opacity: 0.75 }}>{s.label}</Text>
              <AmountText str={hidden ? '••••' : s.val} color={t.onHero} size={15} />
            </View>
          ))}
        </View>

        {breakdown.length > 0 && (
          <Pressable onPress={() => { smooth(); setShowBreakdown(s => !s); }} hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: t.onHero, opacity: 0.8 }}>
              {showBreakdown ? 'Hide breakdown' : 'How it adds up'}
            </Text>
            <Icon name={showBreakdown ? 'arrowUp' : 'chevronDown'} size={13} color={t.onHero} stroke={2} />
          </Pressable>
        )}
        {showBreakdown && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', gap: 7 }}>
            {breakdown.map(p => (
              <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: t.onHero, opacity: 0.8 }}>{p.label}</Text>
                <AmountText str={hidden ? '••••' : (p.plus ? '+' : '−') + fmt(fromKZT(p.val, base), base, false)} color={t.onHero} size={13} />
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>Recent</Text>
      {groups.length === 0 && (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 32 }}>
          Nothing here yet — add a transaction to see your flow.
        </Text>
      )}
      {groups.map(g => (
        <View key={g.label} style={{ gap: 6 }}>
          <CapsLabel>{g.label}</CapsLabel>
          <Card>
            {g.rows.map((tx, i) => {
              const c = cat(tx.categoryId);
              const isTr = tx.type === 'transfer';
              const amtColor = tx.type === 'expense' ? t.negative : tx.type === 'income' ? t.positive : t.transfer;
              const sign = tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '';
              return (
                <Pressable key={tx.id} delayLongPress={250}
                  onPress={() => setInfoTx(tx)}
                  onLongPress={() => openEdit(tx.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
                    borderBottomWidth: i < g.rows.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                    backgroundColor: pressed ? t.surfaceSunken : 'transparent',
                  })}>
                  {isTr
                    ? <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.transferSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="transfer" size={20} color={t.transfer} />
                      </View>
                    : <CategoryIcon icon={c?.icon ?? 'cart'} color={c?.color ?? 'moss'} />}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.bodyMedium, fontSize: 15, color: t.textBody }}>
                      {isTr ? 'Transfer' : c?.name ?? 'Other'}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
                      {isTr ? `${acc(tx.accountId)?.name ?? '?'} → ${acc(tx.toId)?.name ?? '?'}` : acc(tx.accountId)?.name ?? '—'}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </Text>
                  </View>
                  <AmountText str={sign + fmt(tx.amount, tx.currency, false)} color={amtColor} />
                  <Pressable onPress={() => confirmDelete(tx)} hitSlop={8} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={15} color={t.textFaint} />
                  </Pressable>
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>

    <Modal visible={!!infoTx} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setInfoTx(null)}>
      <Pressable onPress={() => setInfoTx(null)} style={{ flex: 1, backgroundColor: 'rgba(20,16,8,0.5)', justifyContent: 'center', padding: space(6) }}>
        {infoTx && (() => {
          const c = cat(infoTx.categoryId);
          const isTr = infoTx.type === 'transfer';
          const amtColor = infoTx.type === 'expense' ? t.negative : infoTx.type === 'income' ? t.positive : t.transfer;
          const sign = infoTx.type === 'expense' ? '−' : infoTx.type === 'income' ? '+' : '';
          const rows = [
            { l: isTr ? 'From' : 'Account', v: acc(infoTx.accountId)?.name ?? '—' },
            ...(isTr ? [{ l: 'To', v: acc(infoTx.toId)?.name ?? '—' }] : []),
            { l: 'Date', v: dateLabel(infoTx.date) },
            ...(infoTx.note ? [{ l: 'Note', v: infoTx.note }] : []),
          ];
          return (
            <Animated.View style={{ opacity: infoAnim, transform: [{ scale: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: t.surfaceCard, borderRadius: radius.xl, padding: 20, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {isTr
                    ? <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.transferSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="transfer" size={22} color={t.transfer} />
                      </View>
                    : <CategoryIcon icon={c?.icon ?? 'cart'} color={c?.color ?? 'moss'} size={46} />}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.bodySemiBold, fontSize: 17, color: t.textBody }}>
                      {isTr ? 'Transfer' : c?.name ?? 'Other'}
                    </Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: t.textFaint }}>
                      {infoTx.type === 'expense' ? 'Expense' : infoTx.type === 'income' ? 'Income' : 'Between accounts'}
                    </Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => setInfoTx(null)} style={({ pressed }) => ({
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: t.surfacePage, opacity: pressed ? 0.6 : 1,
                  })}>
                    <Icon name="x" size={14} color={t.textMuted} stroke={2} />
                  </Pressable>
                </View>

                <AmountText str={sign + fmt(infoTx.amount, infoTx.currency, false)} color={amtColor} size={32} />

                <View style={{ borderRadius: radius.md, backgroundColor: t.surfaceRaised, borderWidth: 1, borderColor: t.borderSoft }}>
                  {rows.map((r, i) => (
                    <View key={r.l} style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 11,
                      borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                    }}>
                      <Text style={{ fontFamily: font.body, fontSize: 12.5, color: t.textFaint }}>{r.l}</Text>
                      <Text numberOfLines={2} style={{ flex: 1, textAlign: 'right', fontFamily: font.bodyMedium, fontSize: 13.5, color: t.textBody }}>{r.v}</Text>
                    </View>
                  ))}
                </View>

                <Pressable onPress={() => openEdit(infoTx.id)} style={({ pressed }) => ({
                  height: 48, borderRadius: radius.pill, backgroundColor: t.accent, flexDirection: 'row', gap: 8,
                  alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
                })}>
                  <Icon name="pencil" size={15} color={t.onAccent} stroke={2} />
                  <Text style={{ fontFamily: font.bodySemiBold, fontSize: 15, color: t.onAccent }}>Edit transaction</Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          );
        })()}
      </Pressable>
    </Modal>
    </>
  );
}
