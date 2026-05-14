import Dexie, { Table } from "dexie";
import type { Template, TemplateFolder, AssetItem, ExportQueueItem } from "../types";

export class ThumbLabDB extends Dexie {
  templates!: Table<Template>;
  folders!: Table<TemplateFolder>;
  assets!: Table<AssetItem>;
  exportQueue!: Table<ExportQueueItem>;

  constructor() {
    super("ThumbLabDB");
    this.version(1).stores({
      templates: "id, folderId, name, createdAt",
      folders: "id, name, createdAt",
      assets: "id, name, role, createdAt",
      exportQueue: "id, variant, addedAt",
    });
  }
}

export const db = new ThumbLabDB();

export async function saveTemplate(template: Template): Promise<void> {
  await db.templates.put(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}

export async function getTemplates(folderId?: string | null): Promise<Template[]> {
  if (folderId === undefined) return db.templates.orderBy("createdAt").reverse().toArray();
  if (folderId === null) return db.templates.where("folderId").equals("").or("folderId").equals(null as unknown as string).toArray();
  return db.templates.where("folderId").equals(folderId).toArray();
}

export async function saveFolder(folder: TemplateFolder): Promise<void> {
  await db.folders.put(folder);
}

export async function deleteFolder(id: string): Promise<void> {
  await db.folders.delete(id);
  await db.templates.where("folderId").equals(id).modify({ folderId: null });
}

export async function getFolders(): Promise<TemplateFolder[]> {
  return db.folders.orderBy("createdAt").toArray();
}

export async function saveAsset(asset: AssetItem): Promise<void> {
  await db.assets.put(asset);
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id);
}

export async function getAssets(): Promise<AssetItem[]> {
  return db.assets.orderBy("createdAt").reverse().toArray();
}

export async function saveQueueItem(item: ExportQueueItem): Promise<void> {
  await db.exportQueue.put(item);
}

export async function removeQueueItem(id: string): Promise<void> {
  await db.exportQueue.delete(id);
}

export async function getQueueItems(): Promise<ExportQueueItem[]> {
  return db.exportQueue.orderBy("addedAt").toArray();
}

export async function clearQueue(): Promise<void> {
  await db.exportQueue.clear();
}
