import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { useState } from 'react';
import { Alert, Linking, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState, PrimaryButton } from '../../components/ui';
import { usePro } from '../../context/ProContext';
import { useScan } from '../../context/ScanContext';
import { mergeGroup, removeContacts, scanContacts, type ContactGroup, type ContactLite, type ContactScan } from '../../lib/contacts';
import { plural } from '../../lib/format';
import { addStats } from '../../lib/storage';
import { spacing, useColors } from '../../theme';

const REASON: Record<ContactGroup['reason'], string> = {
  name: 'Same name',
  phone: 'Same phone number',
  email: 'Same email',
};

export default function ContactsScreen() {
  const c = useColors();
  const { requestDeletes, recordDeletes } = usePro();
  const { refreshStats } = useScan();
  const [scan, setScan] = useState<ContactScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const perm = await Contacts.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Contacts access needed', 'Allow access in Settings to find duplicate contacts.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      setScan(await scanContacts());
    } catch (e: any) {
      Alert.alert('Could not read contacts', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const afterChange = async (n: number) => {
    await recordDeletes(n);
    await addStats({ contactsCleaned: n });
    await refreshStats();
    setScan(await scanContacts());
  };

  const merge = (g: ContactGroup) => {
    Alert.alert(
      'Merge contacts?',
      `${plural(g.contacts.length, 'contact')} will be combined into “${g.contacts[0].name || 'No name'}”. Phone numbers and emails are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: async () => {
            if (!(await requestDeletes(g.contacts.length - 1))) return;
            setBusyId(g.id);
            try {
              await afterChange(await mergeGroup(g));
            } catch (e: any) {
              Alert.alert('Merge failed', e?.message ?? 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const removeOne = (contact: ContactLite) => {
    Alert.alert('Delete contact?', `“${contact.name || 'No name'}” will be removed from your contacts.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!(await requestDeletes(1))) return;
          setBusyId(contact.id);
          try {
            await removeContacts([contact.id]);
            await afterChange(1);
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message ?? 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (!scan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState
          icon="people"
          title="Tidy up your contacts"
          body="Find duplicate contacts to merge and empty entries to delete. Everything happens on your device."
        >
          <PrimaryButton title="Scan Contacts" icon="search" onPress={load} loading={loading} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  type Row = { kind: 'group'; group: ContactGroup } | { kind: 'incomplete'; contact: ContactLite };
  const sections: { title: string; data: Row[] }[] = [
    { title: `Duplicates (${scan.duplicates.length})`, data: scan.duplicates.map((group) => ({ kind: 'group' as const, group })) },
    { title: `Incomplete (${scan.incomplete.length})`, data: scan.incomplete.map((contact) => ({ kind: 'incomplete' as const, contact })) },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => (r.kind === 'group' ? r.group.id : r.contact.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.h1, { color: c.text }]}>Contacts</Text>
            <Text style={{ color: c.textMuted }}>
              {plural(scan.total, 'contact')} scanned{' '}
              <Text onPress={load} style={{ color: c.primary, fontWeight: '700' }}>
                · Rescan
              </Text>
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={[styles.section, { color: c.textMuted }]}>{section.title.toUpperCase()}</Text>}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? <Text style={{ color: c.textMuted, marginBottom: spacing.md }}>Nothing to fix here 🎉</Text> : null
        }
        renderItem={({ item }) =>
          item.kind === 'group' ? (
            <Card style={{ marginBottom: spacing.sm }}>
              <Text style={[styles.reason, { color: c.primary }]}>{REASON[item.group.reason]}</Text>
              {item.group.contacts.map((ct) => (
                <ContactRow key={ct.id} contact={ct} />
              ))}
              <PrimaryButton
                title={`Merge ${item.group.contacts.length}`}
                icon="git-merge"
                variant="ghost"
                loading={busyId === item.group.id}
                onPress={() => merge(item.group)}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ) : (
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ContactRow contact={item.contact} />
                </View>
                <Pressable onPress={() => removeOne(item.contact)} hitSlop={10} disabled={busyId === item.contact.id}>
                  <Ionicons name="trash-outline" size={22} color={c.danger} />
                </Pressable>
              </View>
            </Card>
          )
        }
      />
    </SafeAreaView>
  );
}

function ContactRow({ contact }: { contact: ContactLite }) {
  const c = useColors();
  const detail = [...contact.phones, ...contact.emails].join(' · ') || 'No phone or email';
  return (
    <View style={{ paddingVertical: 6 }}>
      <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{contact.name || 'No name'}</Text>
      <Text style={{ color: c.textMuted, fontSize: 13 }} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: spacing.md, marginBottom: spacing.sm },
  reason: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
});
