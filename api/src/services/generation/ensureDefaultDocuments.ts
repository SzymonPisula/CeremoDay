import { Document } from "../../models/Document";
import { getTemplatesForCeremony, type CeremonyType } from "../../config/documentTemplates";

export async function ensureDefaultDocuments(args: {
  eventId: string;
  ceremonyType: "CIVIL" | "CHURCH" | "RECEPTION_ONLY";
  includeExtras?: boolean;
  transaction: any;
}) {
  const { eventId, ceremonyType, includeExtras = true, transaction } = args;

  // mapowanie Interview -> templates
  let tplType: CeremonyType | null = null;
  if (ceremonyType === "CIVIL") tplType = "civil";
  if (ceremonyType === "CHURCH") tplType = "concordat";
  if (!tplType) return { created: 0, skipped: 0 }; // RECEPTION_ONLY -> nic

  const existing = await Document.findAll({
    where: { event_id: eventId },
    transaction,
  });

  // klucz jak w Twojej generacji: `${type}::${name}`
  const existingKeys = new Set(
    existing.map((d: any) => `${String(d.type).toLowerCase()}::${String(d.name).toLowerCase()}`)
  );

  const templates = getTemplatesForCeremony(tplType, includeExtras);

  let created = 0;
  for (const tpl of templates) {
    const key = `${tplType}::${tpl.name.toLowerCase()}`;
    if (existingKeys.has(key)) continue;

    await Document.create(
      {
        event_id: eventId,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        holder: tpl.holder,
        type: tplType,           // civil | concordat
        status: "todo",
        is_system: true,
        is_pinned: !tpl.is_extra,
      } as any,
      { transaction }
    );

    created++;
  }

  return { created, skipped: templates.length - created };
}
