import * as Contacts from 'expo-contacts/legacy';

export type ContactLite = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  raw: Contacts.ExistingContact;
};

export type ContactGroup = { id: string; reason: 'name' | 'phone' | 'email'; contacts: ContactLite[] };

export type ContactScan = {
  total: number;
  duplicates: ContactGroup[];
  incomplete: ContactLite[];
};

const normName = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const normPhone = (s: string) => s.replace(/\D/g, '').slice(-9);
const normEmail = (s: string) => s.trim().toLowerCase();

function toLite(c: Contacts.ExistingContact): ContactLite {
  const name =
    c.name?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.company?.trim() || '';
  return {
    id: c.id,
    name,
    phones: (c.phoneNumbers ?? []).map((p) => p.number ?? '').filter(Boolean),
    emails: (c.emails ?? []).map((e) => e.email ?? '').filter(Boolean),
    raw: c,
  };
}

export async function scanContacts(): Promise<ContactScan> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.Company,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
    ],
  });
  const list = data.map(toLite);

  // Union-find over shared name / phone / email.
  const parent = new Map<string, string>();
  const reason = new Map<string, ContactGroup['reason']>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string, why: ContactGroup['reason']) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(rb, ra);
      if (!reason.has(ra)) reason.set(ra, why);
    }
  };
  list.forEach((c) => parent.set(c.id, c.id));

  const index = new Map<string, string>();
  const link = (key: string, id: string, why: ContactGroup['reason']) => {
    const seen = index.get(key);
    if (seen) union(seen, id, why);
    else index.set(key, id);
  };
  for (const c of list) {
    if (c.name) link(`n:${normName(c.name)}`, c.id, 'name');
    for (const p of c.phones) {
      const n = normPhone(p);
      if (n.length >= 6) link(`p:${n}`, c.id, 'phone');
    }
    for (const e of c.emails) link(`e:${normEmail(e)}`, c.id, 'email');
  }

  const groups = new Map<string, ContactLite[]>();
  for (const c of list) {
    const r = find(c.id);
    const arr = groups.get(r);
    if (arr) arr.push(c);
    else groups.set(r, [c]);
  }

  const duplicates: ContactGroup[] = [];
  for (const [root, contacts] of groups) {
    if (contacts.length > 1) duplicates.push({ id: root, reason: reason.get(root) ?? 'name', contacts });
  }

  return {
    total: list.length,
    duplicates,
    incomplete: list.filter((c) => !c.name || (c.phones.length === 0 && c.emails.length === 0)),
  };
}

/**
 * Merges a duplicate group into its first contact: phone numbers and emails from
 * the others are copied over (de-duplicated) and the others are removed.
 */
export async function mergeGroup(group: ContactGroup): Promise<number> {
  const [primary, ...rest] = group.contacts;
  const phones = new Map<string, Contacts.PhoneNumber>();
  const emails = new Map<string, Contacts.Email>();
  for (const c of group.contacts) {
    for (const p of c.raw.phoneNumbers ?? []) {
      const key = normPhone(p.number ?? '');
      if (key && !phones.has(key)) phones.set(key, { number: p.number, label: p.label ?? 'mobile' });
    }
    for (const e of c.raw.emails ?? []) {
      const key = normEmail(e.email ?? '');
      if (key && !emails.has(key)) emails.set(key, { email: e.email, label: e.label ?? 'home' });
    }
  }
  await Contacts.updateContactAsync({
    id: primary.id,
    phoneNumbers: [...phones.values()],
    emails: [...emails.values()],
  });
  for (const c of rest) await Contacts.removeContactAsync(c.id);
  return rest.length;
}

export async function removeContacts(ids: string[]): Promise<void> {
  for (const id of ids) await Contacts.removeContactAsync(id);
}
