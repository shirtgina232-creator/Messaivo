/** Pure policy shared by previews, admission, Test Send and worker execution. */
export interface RecipientContext {
  workspaceId: string;
  pageId: string | null;
  metaUserId: string;
  isSubscribed: boolean;
  relationshipVerifiedAt: Date | null;
  lastMessageAt: Date | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export function recipientEligibility(contact: RecipientContext, workspaceId: string, pageId: string, utility: boolean, now = new Date()): string | null {
  if (contact.workspaceId !== workspaceId || contact.pageId !== pageId) return "wrong_page";
  if (!/^\d{5,30}$/.test(contact.metaUserId)) return "invalid_psid";
  if (!contact.isSubscribed) return "unsubscribed";
  // Fall back to lastMessageAt when relationshipVerifiedAt is null (contacts created before the
  // column was added still have a valid inbound-message history tracked in lastMessageAt).
  const verifiedAt = contact.relationshipVerifiedAt ?? contact.lastMessageAt;
  if (!verifiedAt || verifiedAt > now) return "unverified_relationship";
  if (!utility && (!contact.lastMessageAt || contact.lastMessageAt > now || now.getTime() - contact.lastMessageAt.getTime() >= 86_400_000)) return "window_closed";
  return null;
}

export function templateKeys(content: string): string[] {
  // Positional: {{1}}, {{2}} — Meta library templates. Returned sorted numerically.
  const positional = [...new Set([...content.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))]
    .sort((a, b) => Number(a) - Number(b));
  // Named: {{order_id}} — custom templates.
  const named = [...new Set([...content.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)].map(m => m[1]))];
  const stripped = content
    .replace(/\{\{(\d+)\}\}/g, "")
    .replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, "");
  if (/[{}]/.test(stripped)) throw new Error("Malformed placeholders; use {{1}} positional or {{name}} named");
  if (positional.length && named.length) throw new Error("Cannot mix positional {{1}} and named {{name}} placeholders");
  return positional.length ? positional : named;
}

/** True when keys are positional ({{1}}, {{2}}) rather than named ({{order_id}}). */
export function isPositionalKeys(keys: string[]): boolean {
  return keys.length > 0 && keys.every(k => /^\d+$/.test(k));
}

export function parseFieldValues(input: unknown): Record<string, string> {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("fieldValues must be an object of strings");
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string" || value.length > 2000) throw new Error(`Invalid value for ${key}`);
    if (/[{}]/.test(value)) throw new Error(`Unresolved or nested placeholder in ${key}`);
    result[key] = value;
  }
  return result;
}

export function resolveMessage(content: string, input: unknown, contact: Pick<RecipientContext, "name" | "firstName" | "lastName">, pageName: string) {
  const values = parseFieldValues(input);
  const defaults: Record<string, string> = {
    first_name: contact.firstName || contact.name?.split(" ")[0] || "",
    last_name: contact.lastName || contact.name?.split(" ").slice(1).join(" ") || "",
    name: contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    page_name: pageName,
  };
  const parameters: Record<string, string> = {};
  for (const key of templateKeys(content)) {
    // Explicit transactional values always win. Never replace order IDs/dates with samples.
    const value = Object.hasOwn(values, key) ? values[key] : defaults[key];
    if (!value?.trim()) throw new Error(`Missing template variable: ${key}`);
    parameters[key] = value;
  }
  // Replace both positional {{1}} and named {{name}} placeholders.
  const text = content.replace(/\{\{(\d+|[a-z][a-z0-9_]*)\}\}/g, (m, key: string) => parameters[key] ?? m);
  return { parameters, text };
}

export function utilityPayload(psid: string, name: string, parameters: Record<string, string>, language = "en") {
  if (!/^\d{5,30}$/.test(psid) || !/^[a-z0-9_]+$/.test(name)) throw new Error("Invalid PSID or Meta template name");
  const values = parseFieldValues(parameters);
  if (Object.values(values).some(v => !v.trim())) throw new Error("Empty template parameter");
  const keys = Object.keys(values);
  // Meta requires different parameter shapes per template format:
  // - positional ({{1}}): ordered {type,text} WITHOUT parameter_name (Meta rejects it)
  // - named ({{order_id}}): parameter_name is required
  const ordered = isPositionalKeys(keys) ? [...keys].sort((a, b) => Number(a) - Number(b)) : keys;
  const bodyParams = ordered.map(k => isPositionalKeys(keys)
    ? { type: "text", text: values[k] }
    : { type: "text", parameter_name: k, text: values[k] });
  return {
    recipient: { id: psid }, messaging_type: "UTILITY",
    message: { template: { name, language: { code: language }, components: keys.length ? [{
      type: "body", parameters: bodyParams,
    }] : [] } },
  };
}
