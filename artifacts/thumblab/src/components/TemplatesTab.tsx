import { useState, useEffect } from "react";
import { Folder, FolderPlus, Trash2, Edit2, ChevronRight, LayoutGrid, Download, Save } from "lucide-react";
import {
  getTemplates, getFolders, saveFolder, deleteFolder,
  deleteTemplate, saveTemplate,
} from "../lib/db";
import type { Template, TemplateFolder } from "../types";

interface Props {
  onLoadTemplate: (template: Template) => void;
  onSaveTemplate: (folderId: string | null, name: string) => void;
}

export default function TemplatesTab({ onLoadTemplate, onSaveTemplate }: Props) {
  const [folders, setFolders] = useState<TemplateFolder[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null | "all">("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveToFolder, setSaveToFolder] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const [movingTemplate, setMovingTemplate] = useState<string | null>(null);
  const [moveToFolder, setMoveToFolder] = useState<string>("");

  const reload = async () => {
    const [f, t] = await Promise.all([getFolders(), getTemplates()]);
    setFolders(f);
    setTemplates(t);
  };

  useEffect(() => { reload(); }, []);

  const visibleTemplates = selectedFolder === "all"
    ? templates
    : templates.filter(t => t.folderId === (selectedFolder || null));

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await saveFolder({
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      defaultAuthor: "",
      defaultTags: "",
      createdAt: new Date(),
    });
    setNewFolderName("");
    await reload();
  };

  const renameFolder = async (id: string) => {
    if (!editName.trim()) return;
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    await saveFolder({ ...folder, name: editName.trim() });
    setEditingFolder(null);
    await reload();
  };

  const removeFolderHandler = async (id: string) => {
    const count = templates.filter(t => t.folderId === id).length;
    if (count > 0 && !confirm(`Delete folder and its ${count} template(s)?`)) return;
    await deleteFolder(id);
    if (selectedFolder === id) setSelectedFolder("all");
    await reload();
  };

  const handleSave = async () => {
    if (!saveName.trim()) { alert("Please enter a template name"); return; }
    onSaveTemplate(saveToFolder || null, saveName.trim());
    setShowSaveDialog(false);
    setSaveName("");
    await reload();
  };

  const handleMoveTemplate = async () => {
    if (!movingTemplate) return;
    const template = templates.find(t => t.id === movingTemplate);
    if (!template) return;
    await saveTemplate({ ...template, folderId: moveToFolder || null });
    setMovingTemplate(null);
    await reload();
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
      {/* Save button */}
      <button
        className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
        onClick={() => setShowSaveDialog(true)}
      >
        <Save size={14} /> Save Current as Template
      </button>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="card p-3">
          <p className="section-label mb-2">Save Template</p>
          <input
            className="w-full px-3 py-2 text-sm mb-2"
            placeholder="Template name..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
          />
          <select className="w-full px-3 py-2 text-sm mb-2" value={saveToFolder} onChange={e => setSaveToFolder(e.target.value)}>
            <option value="">No Folder</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-2 text-sm" onClick={handleSave}>Save</button>
            <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setShowSaveDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Move template dialog */}
      {movingTemplate && (
        <div className="card p-3">
          <p className="section-label mb-2">Move Template to Folder</p>
          <select className="w-full px-3 py-2 text-sm mb-2" value={moveToFolder} onChange={e => setMoveToFolder(e.target.value)}>
            <option value="">No Folder</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-2 text-sm" onClick={handleMoveTemplate}>Move</button>
            <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setMovingTemplate(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Folders */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="section-label">Folders</span>
        </div>

        <div className="flex gap-1 mb-2">
          <input
            className="flex-1 px-2 py-1.5 text-xs"
            placeholder="New folder name..."
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createFolder()}
          />
          <button className="btn-primary px-2 py-1.5" onClick={createFolder}>
            <FolderPlus size={14} />
          </button>
        </div>

        {/* Folder list */}
        <div className="flex flex-col gap-1">
          <button
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${selectedFolder === "all" ? "bg-cyan-500/10 text-cyan-400" : "hover:bg-white/4"}`}
            style={{ color: selectedFolder === "all" ? "var(--accent-cyan)" : "var(--text-secondary)" }}
            onClick={() => setSelectedFolder("all")}
          >
            <LayoutGrid size={12} /> All Templates
            <span className="ml-auto" style={{ color: "var(--text-muted)", fontSize: 10 }}>({templates.length})</span>
          </button>

          {folders.map(folder => (
            <div key={folder.id} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${selectedFolder === folder.id ? "bg-cyan-500/10" : "hover:bg-white/4"}`}>
              {editingFolder === folder.id ? (
                <div className="flex gap-1 flex-1">
                  <input
                    className="flex-1 px-2 py-0.5 text-xs"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") renameFolder(folder.id); if (e.key === "Escape") setEditingFolder(null); }}
                    autoFocus
                  />
                  <button className="btn-primary px-2 py-0.5 text-xs" onClick={() => renameFolder(folder.id)}>OK</button>
                </div>
              ) : (
                <>
                  <Folder size={12} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                  <span
                    className="flex-1 text-xs"
                    style={{ color: selectedFolder === folder.id ? "var(--accent-cyan)" : "var(--text-secondary)" }}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    {folder.name}
                    <span style={{ color: "var(--text-muted)", marginLeft: 4, fontSize: 10 }}>
                      ({templates.filter(t => t.folderId === folder.id).length})
                    </span>
                  </span>
                  <button className="p-0.5 opacity-60 hover:opacity-100" onClick={() => { setEditingFolder(folder.id); setEditName(folder.name); }}>
                    <Edit2 size={11} style={{ color: "var(--text-muted)" }} />
                  </button>
                  <button className="p-0.5 opacity-60 hover:opacity-100" onClick={() => removeFolderHandler(folder.id)}>
                    <Trash2 size={11} style={{ color: "#ff4444" }} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Template gallery */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="section-label">Templates</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({visibleTemplates.length})</span>
        </div>

        {visibleTemplates.length === 0 ? (
          <div className="flex flex-col items-center py-10" style={{ color: "var(--text-muted)" }}>
            <LayoutGrid size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No templates yet</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>Generate and save thumbnails as templates</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visibleTemplates.map(template => (
              <div key={template.id} className="template-card">
                <div style={{ height: 70, background: "var(--bg-main)", position: "relative" }}>
                  {template.thumbnailBase64 ? (
                    <img src={template.thumbnailBase64} alt={template.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--text-muted)", fontSize: 11 }}>No preview</div>
                  )}
                  <span style={{
                    position: "absolute", top: 4, right: 4, fontSize: 9, fontWeight: 700,
                    background: "rgba(0,0,0,0.7)", color: "var(--accent-cyan)", padding: "2px 5px",
                    borderRadius: 3, letterSpacing: "0.05em"
                  }}>{template.aspectRatio}</span>
                </div>
                <div className="p-2">
                  <p style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{template.name}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button className="btn-primary flex-1 py-1 text-xs" style={{ fontSize: 10 }} onClick={() => onLoadTemplate(template)}>
                      Load
                    </button>
                    <button
                      className="btn-secondary px-1.5 py-1 tooltip" data-tip="Move to folder"
                      onClick={() => { setMovingTemplate(template.id); setMoveToFolder(template.folderId || ""); }}
                    >
                      <ChevronRight size={11} />
                    </button>
                    <button className="btn-danger px-1.5 py-1" onClick={async () => {
                      if (!confirm("Delete this template?")) return;
                      await deleteTemplate(template.id);
                      await reload();
                    }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
