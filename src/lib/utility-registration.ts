import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";
import { createMetaUtilityTemplate, graphRequest } from "@/lib/meta-graph";
import { templateKeys } from "@/lib/messaging-policy";
import type { FacebookPage, UtilityTemplateRegistration } from "@prisma/client";

export const contentHash = (content: string) => createHash("sha256").update(content).digest("hex");

/** Approval of the app permission does not grant it to existing Page tokens. */
export async function verifyPageGrant(page: FacebookPage, utility = true) {
  const token = decryptToken(page.accessToken);
  try {
    if (!page.isActive) throw new Error("Facebook Page is inactive");
    const appId = process.env.META_APP_ID;
    const secret = process.env.META_APP_SECRET;
    if (!appId || !secret) throw new Error("Meta app credentials are missing");
    const [identity, debug] = await Promise.all([
      graphRequest(token, "/me?fields=id"),
      graphRequest(appId + "|" + secret, "/debug_token?input_token=" + encodeURIComponent(token)),
    ]);
    const data = debug.data;
    const now = Math.floor(Date.now() / 1000);
    if (identity.id !== page.pageId || !data?.is_valid || String(data.app_id) !== appId ||
      (data.expires_at && data.expires_at <= now) || (data.data_access_expires_at && data.data_access_expires_at <= now)) throw new Error("Invalid, expired, or wrong-Page access token; reconnect this Page");
    const allowed = (scope: string) => {
      if (!data.scopes?.includes(scope)) return false;
      const granular = data.granular_scopes?.find((g: { scope: string }) => g.scope === scope);
      return !granular?.target_ids || granular.target_ids.includes(page.pageId);
    };
    const granted = allowed("pages_utility_messaging");
    await prisma.facebookPage.update({ where: { id: page.id }, data: { utilityPermissionGranted: granted, permissionsCheckedAt: new Date(), permissionError: granted ? null : "Reconnect and grant pages_utility_messaging for this Page" } });
    if (!allowed("pages_messaging") || (utility && !granted)) throw new Error("Required messaging grant missing for this Page; reconnect and consent again");
    return token;
  } catch (error) {
    await prisma.facebookPage.update({ where: { id: page.id }, data: { utilityPermissionGranted: false, permissionsCheckedAt: new Date(), permissionError: error instanceof Error ? error.message : "Permission check failed" } });
    throw error;
  }
}

export async function refreshRegistration(registration: UtilityTemplateRegistration, token: string, metaPageId: string) {
  // Search only this Page's collection. A global Meta ID lookup is not proof of ownership.
  let after = "";
  let found;
  do {
    const response = await graphRequest(token, `/${metaPageId}/message_templates?fields=id,name,status,language,category,components&limit=100${after ? "&after=" + encodeURIComponent(after) : ""}`);
    found = response.data?.find((t: { id: string; name: string; language: string }) => t.name === registration.metaTemplateName && t.language === registration.language && (!registration.metaTemplateId || String(t.id) === registration.metaTemplateId));
    after = !found && response.paging?.next ? response.paging?.cursors?.after || "" : "";
  } while (after);
  const body = found?.components?.find((c: { type: string }) => c.type.toUpperCase() === "BODY");
  const supported = found && found.category === "UTILITY" && body?.text === registration.content && found.components.length === 1;
  return prisma.utilityTemplateRegistration.update({ where: { id: registration.id }, data: {
    metaTemplateId: found?.id ? String(found.id) : registration.metaTemplateId,
    status: !found ? "MISSING" : supported ? String(found.status).toUpperCase() : "CONTENT_MISMATCH",
    lastCheckedAt: new Date(), lastError: supported ? null : "Template missing, modified, or contains unsupported components",
  } });
}

export async function approvedRegistration(workspaceId: string, pageId: string, templateId: string, registrationId?: string | null) {
  const page = await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId } });
  const template = await prisma.globalTemplate.findFirst({ where: { id: templateId, isActive: true, status: "active" } });
  if (!page || !template) throw new Error("Active Page and catalog template are required");
  const hash = contentHash(template.content);
  const row = await prisma.utilityTemplateRegistration.findFirst({ where: { workspaceId, pageId, templateId, contentHash: hash, ...(registrationId ? { id: registrationId } : {}) } });
  if (!row) throw new Error("Register this template revision for the selected Page first");
  const token = await verifyPageGrant(page);
  const registration = await refreshRegistration(row, token, page.pageId);
  if (registration.status !== "APPROVED" || !registration.metaTemplateId) throw new Error(`Meta template is not approved (${registration.status})`);
  return { page, token, registration };
}

export async function registerUtilityTemplate(workspaceId: string, pageId: string, templateId: string) {
  const page = await prisma.facebookPage.findFirst({ where: { id: pageId, workspaceId } });
  const template = await prisma.globalTemplate.findFirst({ where: { id: templateId, isActive: true, status: "active" } });
  if (!page || !template) throw new Error("Page or active template not found");
  const token = await verifyPageGrant(page);
  const hash = contentHash(template.content);
  const keys = templateKeys(template.content);
  const name = `m_${contentHash(page.id + template.id).slice(0, 12)}_${hash.slice(0, 16)}`;
  const row = await prisma.utilityTemplateRegistration.upsert({
    where: { pageId_templateId_contentHash: { pageId, templateId, contentHash: hash } },
    create: { workspaceId, pageId, templateId, contentHash: hash, content: template.content, parameterKeys: keys, metaTemplateName: name, status: "CREATING" }, update: {},
  });
  const current = await refreshRegistration(row, token, page.pageId);
  if (current.status !== "MISSING") return current;
  // Claim creation; a lost response is reconciled by name before any subsequent retry.
  const claim = await prisma.utilityTemplateRegistration.updateMany({ where: { id: row.id, status: "MISSING" }, data: { status: "CREATING" } });
  if (!claim.count) throw new Error("Registration is already in progress; refresh shortly");
  const definitions = Array.isArray(template.fields) ? template.fields as Array<{ key: string; example?: string; label?: string }> : [];
  const result = await createMetaUtilityTemplate(token, page.pageId, name, template.content, keys.map(key => ({ key, example: definitions.find(f => f.key === key)?.example || (key.includes("name") ? "Jane" : key.includes("date") ? "2026-10-01" : "12345") })));
  return prisma.utilityTemplateRegistration.update({ where: { id: row.id }, data: { metaTemplateId: result.metaTemplateId, status: result.status, lastError: result.error || null, lastCheckedAt: new Date() } });
}
