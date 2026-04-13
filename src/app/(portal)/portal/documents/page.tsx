"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  FolderOpen,
  Shield,
  CircleDot,
  AlertCircle,
  SlidersHorizontal,
  ArrowUpDown,
  FileText,
  BookOpen,
  File,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ───── Types ───── */

type DocCategory =
  | "All Documents"
  | "Certificates"
  | "Registration"
  | "Owner Manuals"
  | "Coast Guard"
  | "Insurance"
  | "Warranties";

interface DocumentItem {
  id: string;
  badges: { label: string; color: string }[];
  uploaded: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  extraMeta: string;
  extraMetaColor?: string;
  previewIcon: React.ElementType;
  previewFileName: string;
  previewAction: string;
  category: DocCategory[];
  group: string;
  highlighted?: boolean;
}

interface UploadedDoc {
  id: string;
  title: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  category: string;
  uploaded_at: string;
}

const UPLOAD_CATEGORIES = [
  { value: "certificate", label: "Certificate", color: "bg-gold-muted text-gold" },
  { value: "registration", label: "Registration", color: "bg-indigo-500/20 text-indigo-400" },
  { value: "owner_manual", label: "Owner Manual", color: "bg-orange-500/20 text-orange-400" },
  { value: "coast_guard", label: "Coast Guard", color: "bg-blue-500/20 text-blue-400" },
  { value: "insurance", label: "Insurance", color: "bg-purple-500/20 text-purple-400" },
  { value: "warranty", label: "Warranty", color: "bg-yellow-500/20 text-yellow-400" },
] as const;

type UploadCategory = (typeof UPLOAD_CATEGORIES)[number]["value"];

const CATEGORY_META: Record<string, { label: string; color: string }> = Object.fromEntries(
  UPLOAD_CATEGORIES.map((c) => [c.value, { label: c.label, color: c.color }])
);

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* ───── Static data ───── */

const stats = [
  {
    icon: FolderOpen,
    value: "18",
    label: "Total Documents",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    valueColor: "text-text-primary",
  },
  {
    icon: Shield,
    value: "6",
    label: "Certificates",
    iconColor: "text-gold",
    iconBg: "bg-gold-muted",
    valueColor: "text-text-primary",
  },
  {
    icon: CircleDot,
    value: "4",
    label: "Coast Guard",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    valueColor: "text-text-primary",
  },
  {
    icon: AlertCircle,
    value: "2",
    label: "Expiring Soon",
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    valueColor: "text-red-400",
  },
];

const tabs: { label: DocCategory; count?: number }[] = [
  { label: "All Documents", count: 18 },
  { label: "Certificates" },
  { label: "Registration" },
  { label: "Owner Manuals" },
  { label: "Coast Guard" },
  { label: "Insurance" },
  { label: "Warranties" },
];

const documents: DocumentItem[] = [
  {
    id: "uscg-doc",
    badges: [
      { label: "Coast Guard", color: "bg-blue-500/20 text-blue-400" },
      { label: "Active", color: "bg-emerald-500/20 text-emerald-400" },
    ],
    uploaded: "Uploaded Mar 1, 2026",
    title: "USCG Certificate of Documentation",
    description:
      "Official number: 1284756 — Valid through December 2026. Endorsed for Coastwise and Recreation.",
    fileType: "PDF",
    fileSize: "2.4 MB",
    extraMeta: "Expires: Dec 31, 2026",
    previewIcon: FileText,
    previewFileName: "USCG_Doc.pdf",
    previewAction: "View Document",
    category: ["All Documents", "Certificates", "Coast Guard"],
    group: "Certificates & Registration",
  },
  {
    id: "vessel-reg",
    badges: [
      { label: "Registration", color: "bg-indigo-500/20 text-indigo-400" },
      { label: "Current", color: "bg-emerald-500/20 text-emerald-400" },
    ],
    uploaded: "Uploaded Feb 15, 2026",
    title: "Washington State Vessel Registration",
    description:
      "Registration number: WN-4821-QY — Renewed annually. Current registration valid through June 2027.",
    fileType: "PDF",
    fileSize: "1.8 MB",
    extraMeta: "Expires: Jun 30, 2027",
    extraMetaColor: "text-emerald-400",
    previewIcon: FileText,
    previewFileName: "Vessel_Reg.pdf",
    previewAction: "View Document",
    category: ["All Documents", "Registration"],
    group: "Certificates & Registration",
    highlighted: true,
  },
  {
    id: "owners-manual",
    badges: [
      { label: "Owner Manual", color: "bg-orange-500/20 text-orange-400" },
    ],
    uploaded: "Uploaded Jan 10, 2026",
    title: "Viking 52 Sport Tower — Owner\u2019s Manual",
    description:
      "Complete owner\u2019s manual covering vessel operations, systems diagrams, recommended maintenance schedules, and warranty information.",
    fileType: "PDF",
    fileSize: "48.2 MB",
    extraMeta: "156 pages",
    previewIcon: BookOpen,
    previewFileName: "Owners_Manual.pdf",
    previewAction: "View Document",
    category: ["All Documents", "Owner Manuals"],
    group: "Owner Manuals & Guides",
  },
  {
    id: "insurance-cert",
    badges: [
      { label: "Insurance", color: "bg-purple-500/20 text-purple-400" },
      { label: "Active", color: "bg-emerald-500/20 text-emerald-400" },
    ],
    uploaded: "Uploaded Feb 28, 2026",
    title: "Marine Insurance Certificate — Full Coverage",
    description:
      "Comprehensive hull and liability coverage through Pacific Maritime Insurance. Policy #PMI-2026-4821. Includes towing, salvage, and personal effects.",
    fileType: "PDF",
    fileSize: "3.1 MB",
    extraMeta: "Renews: Jan 15, 2027",
    previewIcon: Shield,
    previewFileName: "Insurance_Cert.pdf",
    previewAction: "View Document",
    category: ["All Documents", "Insurance"],
    group: "Insurance & Warranties",
  },
  {
    id: "engine-warranty",
    badges: [
      { label: "Warranty", color: "bg-yellow-500/20 text-yellow-400" },
      { label: "Expiring Soon", color: "bg-red-500/20 text-red-400" },
    ],
    uploaded: "Uploaded Dec 5, 2025",
    title: "Volvo Penta D6 Engine Warranty Certificate",
    description:
      "Factory warranty for twin Volvo Penta D6-435 engines. Covers powertrain, electronics, and turbocharger. Extended warranty purchased through dealer.",
    fileType: "PDF",
    fileSize: "5.6 MB",
    extraMeta: "Expires: Apr 30, 2026",
    extraMetaColor: "text-red-400",
    previewIcon: FileText,
    previewFileName: "Engine_Warranty.pdf",
    previewAction: "View Document",
    category: ["All Documents", "Warranties"],
    group: "Insurance & Warranties",
  },
];

const groupMeta: Record<string, string> = {
  "Certificates & Registration": "bg-gold",
  "Owner Manuals & Guides": "bg-emerald-400",
  "Insurance & Warranties": "bg-blue-400",
};

/* ───── Component ───── */

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<DocCategory>("All Documents");
  const [isDragOver, setIsDragOver] = useState(false);
  const [cardDragOver, setCardDragOver] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<UploadCategory>("certificate");

  const refetch = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("documents")
      .select("id,title,file_name,file_type,file_size,storage_path,category,uploaded_at")
      .order("uploaded_at", { ascending: false });
    if (!error && data) setUploadedDocs(data as UploadedDoc[]);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const uploadFiles = useCallback(async (files: FileList) => {
    const supabase = createClient();
    if (!supabase) { setUploadError("Supabase is not configured"); return; }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setUploadError("Please sign in to upload documents"); return; }

    setUploading(true);
    setUploadError(null);

    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) { setUploadError(upErr.message); continue; }

        const { error: dbErr } = await supabase.from("documents").insert({
          user_id: user.id,
          title: file.name.replace(/\.[^.]+$/, ""),
          category: uploadCategory,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
          storage_path: path,
        });
        if (dbErr) setUploadError(dbErr.message);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      }
    }

    setUploading(false);
    await refetch();
  }, [refetch, uploadCategory]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    e.target.value = "";
  }, [uploadFiles]);

  const handleDownload = useCallback(async (storagePath: string, fileName: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60);
    if (error || !data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleDelete = useCallback(async (id: string, storagePath: string) => {
    const supabase = createClient();
    if (!supabase) return;
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("documents").remove([storagePath]);
    await supabase.from("documents").delete().eq("id", id);
    await refetch();
  }, [refetch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const filtered = documents.filter((d) => d.category.includes(activeTab));

  // Group the filtered documents
  const grouped = filtered.reduce<Record<string, DocumentItem[]>>(
    (acc, doc) => {
      if (!acc[doc.group]) acc[doc.group] = [];
      acc[doc.group].push(doc);
      return acc;
    },
    {}
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            Vessel Documents
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Store and manage certificates, registration, manuals, and Coast
            Guard documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary">
            <ArrowUpDown className="h-4 w-4" />
            Sort by Date
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragOver
            ? "border-gold bg-gold-muted"
            : "border-border bg-bg-card/50"
        )}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-400/10">
          <Upload className="h-6 w-6 text-blue-400" />
        </div>
        <p className="text-lg font-medium text-text-primary">
          Drag &amp; Drop Documents Here
        </p>
        <p className="mt-1 max-w-md text-sm text-text-secondary">
          Upload certificates, registration, owner manuals, and vessel
          documentation. Supports PDF, JPG, PNG
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Category
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as UploadCategory)}
              disabled={uploading}
              className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:border-gold/40 focus:border-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={handleBrowseClick}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Browse Files"}
          </button>
          <span className="text-sm text-text-secondary">
            or drop files above
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={handleFileInputChange}
        />
        {uploadError && (
          <p className="mt-3 text-sm text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-medium text-text-primary">
              Your Documents
            </h2>
            <span className="text-xs text-text-secondary">
              {uploadedDocs.length} uploaded
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-gold/40"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/10">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                      className="rounded-md p-1.5 text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.storage_path)}
                      className="rounded-md p-1.5 text-text-secondary hover:bg-red-500/10 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="truncate text-sm font-medium text-text-primary" title={doc.title}>
                  {doc.title}
                </p>
                <p className="truncate text-xs text-text-secondary" title={doc.file_name}>
                  {doc.file_name}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {CATEGORY_META[doc.category] && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CATEGORY_META[doc.category].color)}>
                      {CATEGORY_META[doc.category].label}
                    </span>
                  )}
                  <span className="text-xs text-text-secondary">
                    {formatBytes(doc.file_size)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-text-secondary">
                  {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    stat.iconBg
                  )}
                >
                  <Icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
              <p
                className={cn("text-2xl font-semibold", stat.valueColor)}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg-card p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.label
                ? "bg-gold-muted text-gold"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  activeTab === tab.label
                    ? "bg-gold/20 text-gold"
                    : "bg-border text-text-secondary"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document Groups */}
      <div className="space-y-10">
        {Object.entries(grouped).map(([groupName, docs]) => (
          <section key={groupName}>
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  groupMeta[groupName] ?? "bg-text-secondary"
                )}
              />
              <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                {groupName}
              </h2>
            </div>

            <div className="space-y-4">
              {docs.map((doc) => {
                const PreviewIcon = doc.previewIcon;
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-bg-card transition-colors",
                      doc.highlighted
                        ? "border-blue-500/50"
                        : "border-border"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Content */}
                      <div className="flex-1 p-5">
                        {/* Badges + date */}
                        <div className="mb-2 flex items-center gap-2">
                          {doc.badges.map((badge) => (
                            <span
                              key={badge.label}
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                badge.color
                              )}
                            >
                              {badge.label}
                            </span>
                          ))}
                          <span className="ml-auto text-xs text-text-secondary">
                            {doc.uploaded}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-text-primary">
                          {doc.title}
                        </h3>

                        {/* Description */}
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                          {doc.description}
                        </p>

                        {/* File meta */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
                          <span className="flex items-center gap-1.5">
                            <File className="h-3.5 w-3.5" />
                            {doc.fileType} &middot; {doc.fileSize}
                          </span>
                          <span
                            className={
                              doc.extraMetaColor ?? "text-text-secondary"
                            }
                          >
                            {doc.extraMeta}
                          </span>
                        </div>
                      </div>

                      {/* Preview card */}
                      <div className="flex w-52 shrink-0 flex-col items-center justify-center border-l border-border bg-bg-secondary/50 p-5">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-card">
                          <PreviewIcon className="h-6 w-6 text-text-secondary" />
                        </div>
                        <p className="mb-3 text-xs font-medium text-text-primary">
                          {doc.previewFileName}
                        </p>
                        <button className="rounded-lg border border-border bg-bg-card px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-bg-card-hover">
                          {doc.previewAction}
                        </button>
                      </div>

                      {/* Drop zone to add related doc */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setCardDragOver(doc.id);
                        }}
                        onDragLeave={() => setCardDragOver(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCardDragOver(null);
                        }}
                        className={cn(
                          "hidden w-40 shrink-0 flex-col items-center justify-center border-l border-dashed p-4 text-center transition-colors sm:flex",
                          cardDragOver === doc.id
                            ? "border-gold bg-gold/5"
                            : "border-border/50 bg-bg-secondary/20 hover:border-border hover:bg-bg-secondary/40"
                        )}
                      >
                        <Upload
                          className={cn(
                            "mb-2 h-5 w-5",
                            cardDragOver === doc.id
                              ? "text-gold"
                              : "text-text-secondary/40"
                          )}
                        />
                        <p
                          className={cn(
                            "text-[10px] font-medium leading-tight",
                            cardDragOver === doc.id
                              ? "text-gold"
                              : "text-text-secondary/60"
                          )}
                        >
                          Drag &amp; drop to add another doc
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
