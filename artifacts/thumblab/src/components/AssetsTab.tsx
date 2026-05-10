import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, User, Image, Package } from "lucide-react";
import { getAssets, saveAsset, deleteAsset } from "../lib/db";
import type { AssetItem, ObjectRole } from "../types";

interface Props {
  onUseAsset: (asset: AssetItem) => void;
}

const ROLES: { value: ObjectRole; label: string; icon: React.ReactNode }[] = [
  { value: "character", label: "Character / Subject", icon: <User size={12} /> },
  { value: "prop", label: "Prop", icon: <Package size={12} /> },
  { value: "background", label: "Background", icon: <Image size={12} /> },
];

export default function AssetsTab({ onUseAsset }: Props) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<ObjectRole>("character");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => setAssets(await getAssets());

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const base64 = await readFileAsBase64(file);
      const asset: AssetItem = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        base64,
        role: selectedRole,
        createdAt: new Date(),
      };
      await saveAsset(asset);
    }
    await load();
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    await deleteAsset(id);
    await load();
  };

  const roleGroups = ROLES.map(r => ({
    ...r,
    items: assets.filter(a => a.role === r.value),
  }));

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
      {/* Upload area */}
      <div>
        <label className="section-label">Upload Assets</label>
        <div className="mb-2 flex gap-1">
          {ROLES.map(r => (
            <button
              key={r.value}
              className={`flex-1 py-1.5 text-xs flex items-center justify-center gap-1 ${selectedRole === r.value ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: 11 }}
              onClick={() => setSelectedRole(r.value)}
            >
              {r.icon} {r.label.split(" ")[0]}
            </button>
          ))}
        </div>
        <div
          className="card border-dashed flex flex-col items-center justify-center py-6 cursor-pointer"
          style={{ borderColor: "var(--border-color)", borderStyle: "dashed" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={async e => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
              const base64 = await readFileAsBase64(file);
              await saveAsset({ id: `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: file.name, base64, role: selectedRole, createdAt: new Date() });
            }
            await load();
          }}
        >
          <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Drop images or click to upload</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>PNG with transparency recommended for characters</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Asset gallery by role */}
      {roleGroups.map(group => (
        group.items.length > 0 && (
          <div key={group.value}>
            <div className="flex items-center gap-2 mb-2">
              <span className="section-label">{group.label}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({group.items.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map(asset => (
                <div key={asset.id} className="asset-card">
                  <div style={{ height: 80, background: "repeating-conic-gradient(#1a1f3a 0% 25%, #131837 0% 50%) 0 0/12px 12px", position: "relative" }}>
                    <img src={asset.base64} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <button
                      className="btn-danger absolute top-1 right-1 p-1"
                      style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4 }}
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <div className="p-2">
                    <p style={{ fontSize: 10, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
                    <button
                      className="btn-primary w-full mt-1 py-1 text-xs"
                      style={{ fontSize: 11 }}
                      onClick={() => onUseAsset(asset)}
                    >
                      Use on Canvas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {assets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--text-muted)" }}>
          <Image size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>No assets yet</p>
          <p style={{ fontSize: 11, opacity: 0.7 }}>Upload characters, props, or backgrounds</p>
        </div>
      )}
    </div>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target?.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
