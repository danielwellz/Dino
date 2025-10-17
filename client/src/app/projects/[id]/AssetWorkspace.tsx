"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Asset,
  AssetFolder,
  AssetTag,
  AssetVisibility,
} from "@/app/types/types";
import {
  useCreateAssetFolderMutation,
  useCreateAssetMutation,
  useCreateAssetTagMutation,
  useGetAssetFoldersQuery,
  useGetAssetTagsQuery,
  useGetAssetsQuery,
} from "@/state/api";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  Folder as FolderIcon,
  FolderPlus,
  Link2,
  RefreshCw,
  Sparkles,
  TagIcon,
  UploadCloud,
  XCircle,
} from "lucide-react";

type AssetWorkspaceProps = {
  projectId: string;
  teamId?: number;
};

type PendingUpload = {
  id: string;
  file: File;
  preview: string;
  name: string;
  description: string;
  tags: string[];
  status: "idle" | "uploading" | "uploaded" | "error";
  error?: string;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const flattenFolders = (nodes: AssetFolder[] = []): AssetFolder[] => {
  const queue: AssetFolder[] = [...nodes];
  const result: AssetFolder[] = [];
  while (queue.length) {
    const node = queue.shift();
    if (!node) continue;
    result.push(node);
    if (node.children?.length) {
      queue.push(...node.children);
    }
  }
  return result;
};

const slugifyTagKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `tag-${Date.now()}`;
const AssetWorkspace = ({ projectId, teamId }: AssetWorkspaceProps) => {
  const numericProjectId = Number(projectId);

  const {
    data: folderData,
    isLoading: isLoadingFolders,
    isFetching: isFetchingFolders,
    refetch: refetchFolders,
    error: folderError,
  } = useGetAssetFoldersQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );

  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    isFetching: isFetchingAssets,
    refetch: refetchAssets,
    error: assetError,
  } = useGetAssetsQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );

  const {
    data: tagsData,
    isFetching: isFetchingTags,
  } = useGetAssetTagsQuery(
    { teamId: teamId?.toString() ?? "" },
    { skip: !teamId },
  );

  const [createAsset] = useCreateAssetMutation();
  const [createFolder] = useCreateAssetFolderMutation();
  const [createTag] = useCreateAssetTagMutation();

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderVisibility, setNewFolderVisibility] = useState(
    AssetVisibility.TEAM,
  );
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [aiPreview, setAiPreview] = useState<
    |
      {
        status: string;
        suggestions: { key: string; confidence: number }[];
      }
    | null
  >(null);

  const flatFolders = useMemo(
    () => flattenFolders(folderData?.folders ?? []),
    [folderData?.folders],
  );

  const selectedFolder = useMemo(
    () =>
      selectedFolderId != null
        ? flatFolders.find((folder) => folder.id === selectedFolderId) ?? null
        : null,
    [flatFolders, selectedFolderId],
  );

  const canUpload =
    selectedFolder?.permissions?.canUpload ??
    (flatFolders.length === 0 && pendingUploads.length === 0);

  const tagOptions = useMemo(
    () =>
      (tagsData?.tags ?? []).map((tag: AssetTag) => ({
        value: tag.key,
        label: tag.labelEn,
      })),
    [tagsData?.tags],
  );

  useEffect(() => {
    if (!selectedFolderId && folderData?.folders?.length) {
      setSelectedFolderId(folderData.folders[0].id);
    }
  }, [folderData?.folders, selectedFolderId]);

  const assets = assetsData?.assets ?? [];
  const filteredAssets = useMemo(() => {
    let list: Asset[] = assets;
    if (selectedFolderId != null) {
      list = list.filter((asset) => asset.folderId === selectedFolderId);
    }
    if (filterText.trim()) {
      const search = filterText.trim().toLowerCase();
      list = list.filter(
        (asset) =>
          asset.name.toLowerCase().includes(search) ||
          asset.description?.toLowerCase().includes(search),
      );
    }
    if (tagFilter.length) {
      list = list.filter((asset) => {
        const assetTags = asset.tags?.map((item) => item.tag.key) ?? [];
        return tagFilter.every((tag) => assetTags.includes(tag));
      });
    }
    return list;
  }, [assets, filterText, selectedFolderId, tagFilter]);

  const clearFeedbackAfterDelay = useCallback(() => {
    if (!feedbackMessage) {
      return undefined;
    }
    const id = window.setTimeout(() => setFeedbackMessage(null), 3200);
    return () => window.clearTimeout(id);
  }, [feedbackMessage]);

  useEffect(
    () => clearFeedbackAfterDelay(),
    [clearFeedbackAfterDelay],
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canUpload) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!canUpload) {
      setFeedbackMessage(
        "Select a folder you have upload access to before adding files.",
      );
      return;
    }

    const incoming = Array.from(files);
    if (!incoming.length) return;

    const uploads: PendingUpload[] = [];
    for (const file of incoming) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        uploads.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          preview: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
          description: "",
          tags: [],
          status: "idle",
        });
      } catch (error) {
        console.error("Failed to read file", error);
        setFeedbackMessage(`Could not read ${file.name}.`);
      }
    }

    setPendingUploads((prev) => [...prev, ...uploads]);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      await handleFiles(event.dataTransfer.files);
    }
  };

  const handleSelectFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files?.length) {
      await handleFiles(files);
      event.target.value = "";
    }
  };

  const updatePendingUpload = (
    uploadId: string,
    updater: (upload: PendingUpload) => PendingUpload,
  ) => {
    setPendingUploads((prev) =>
      prev.map((upload) =>
        upload.id === uploadId ? updater(upload) : upload,
      ),
    );
  };

  const removePendingUpload = (uploadId: string) => {
    setPendingUploads((prev) => prev.filter((item) => item.id !== uploadId));
  };

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newFolderName.trim()) {
      setFeedbackMessage("Folder name is required.");
      return;
    }
    try {
      setIsCreatingFolder(true);
      const result = await createFolder({
        projectId: numericProjectId,
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || undefined,
        parentId: selectedFolderId ?? undefined,
        visibility: newFolderVisibility,
      }).unwrap();

      setFeedbackMessage(
        `Folder "${result.folder?.name ?? newFolderName}" created.`,
      );
      setNewFolderName("");
      setNewFolderDescription("");
      setNewFolderVisibility(AssetVisibility.TEAM);
      if (result.folder?.id) {
        setSelectedFolderId(result.folder.id);
      }
    } catch (error: any) {
      console.error("Failed to create folder", error);
      setFeedbackMessage(error?.data?.message ?? "Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadPending = async (upload: PendingUpload) => {
    if (!canUpload) {
      setFeedbackMessage("You do not have permission to upload to this folder.");
      return;
    }

    updatePendingUpload(upload.id, (item) => ({
      ...item,
      status: "uploading",
      error: undefined,
    }));

    try {
      const response = await createAsset({
        projectId: numericProjectId,
        name: upload.name.trim() || upload.file.name,
        description: upload.description.trim() || undefined,
        fileURL: upload.preview,
        previewURL: upload.preview,
        mimeType: upload.file.type,
        size: upload.file.size,
        folderId: selectedFolderId ?? undefined,
        tags: upload.tags,
      }).unwrap();

      setAiPreview(response.ai);
      setFeedbackMessage(`Uploaded "${response.asset.name}".`);
      setPendingUploads((prev) =>
        prev.filter((item) => item.id !== upload.id),
      );
    } catch (error: any) {
      console.error("Upload failed", error);
      updatePendingUpload(upload.id, (item) => ({
        ...item,
        status: "error",
        error: error?.data?.message ?? "Failed to upload asset.",
      }));
    }
  };

  const handleCreateTagOption = async (label: string, uploadId: string) => {
    if (!teamId) {
      setFeedbackMessage("Join the project team to create shared tags.");
      return;
    }
    const key = slugifyTagKey(label);
    try {
      await createTag({
        key,
        labelEn: label,
        teamId,
      }).unwrap();
      updatePendingUpload(uploadId, (item) => ({
        ...item,
        tags: Array.from(new Set([...item.tags, key])),
      }));
    } catch (error: any) {
      console.error("Failed to create tag", error);
      setFeedbackMessage(error?.data?.message ?? "Could not create tag.");
    }
  };
  const renderFolderTree = (folders: AssetFolder[], depth = 0) => {
    return folders.map((folder) => {
      const isSelected = selectedFolderId === folder.id;
      const badge =
        folder.assetCount != null ? `${folder.assetCount}` : undefined;
      return (
        <div key={folder.id} className="mb-1">
          <button
            type="button"
            onClick={() => setSelectedFolderId(folder.id)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition ${
              isSelected
                ? "bg-primary-50 text-primary-700"
                : "hover:bg-slate-100"
            }`}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            <span className="flex items-center gap-2">
              <FolderIcon size={16} />
              <span className="text-sm font-medium">{folder.name}</span>
            </span>
            {badge ? (
              <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-700">
                {badge}
              </span>
            ) : null}
          </button>
          {folder.children?.length
            ? renderFolderTree(folder.children, depth + 1)
            : null}
        </div>
      );
    });
  };

  const loadingState =
    isLoadingFolders || isLoadingAssets || isFetchingFolders || isFetchingAssets;

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total Assets
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {folderData?.summary?.totalAssets ?? 0}
              </p>
            </div>
            <Sparkles className="text-primary-500" size={28} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Keep your campaign, reference, and production files organized across
            the team.
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Folders
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {folderData?.summary?.totalFolders ?? 0}
              </p>
            </div>
            <FolderPlus className="text-primary-500" size={28} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Build a taxonomy that mirrors your production workflow and access
            rules.
          </p>
        </div>
        <div className="flex min-w-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => {
              refetchFolders();
              refetchAssets();
            }}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      {feedbackMessage ? (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          {feedbackMessage}
        </div>
      ) : null}

      {aiPreview ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-primary-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Sparkles className="mt-0.5 text-primary-500" size={18} />
          <div>
            <p className="font-medium text-primary-700">
              AI Tagging Preview ({aiPreview.status})
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {aiPreview.suggestions.map((suggestion) => (
                <span
                  key={suggestion.key}
                  className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700"
                >
                  {suggestion.key} - {(suggestion.confidence * 100).toFixed(0)}%
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Hook this placeholder into your preferred vision or metadata
              service when you are ready.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <aside className="xl:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Folder Taxonomy
              </h3>
              <span className="text-xs text-slate-400">
                {flatFolders.length} nodes
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto pr-2">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  selectedFolderId == null
                    ? "bg-primary-50 text-primary-700"
                    : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderIcon size={16} />
                  <span>All assets</span>
                </span>
                <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-700">
                  {assets.length}
                </span>
              </button>
              {folderData?.folders?.length
                ? renderFolderTree(folderData.folders)
                : (
                  <p className="mt-6 text-center text-xs text-slate-400">
                    No folders yet. Create your first library node below.
                  </p>
                  )}
            </div>

            <form
              onSubmit={handleCreateFolder}
              className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Create Folder
              </p>
              <input
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder="Moodboard references"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                required
              />
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                rows={2}
                placeholder="Optional description"
                value={newFolderDescription}
                onChange={(event) =>
                  setNewFolderDescription(event.target.value)
                }
              />
              <div className="flex items-center gap-2">
                <label className="flex-1 text-xs text-slate-500">
                  Visibility
                </label>
                <select
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
                  value={newFolderVisibility}
                  onChange={(event) =>
                    setNewFolderVisibility(
                      event.target.value as AssetVisibility,
                    )
                  }
                >
                  <option value={AssetVisibility.TEAM}>Team wide</option>
                  <option value={AssetVisibility.PROJECT}>Project only</option>
                  <option value={AssetVisibility.PRIVATE}>Private</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isCreatingFolder}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <FolderPlus size={16} />
                {isCreatingFolder ? "Creating..." : "Create folder"}
              </button>
            </form>
          </div>
        </aside>
        <section className="xl:col-span-3 space-y-5">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                isDragging ? "border-primary-400 bg-primary-50" : "border-transparent bg-slate-50"
              } px-6 py-10 text-center transition`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className="text-primary-500" size={36} />
              <p className="mt-3 text-sm font-medium text-slate-800">
                Drag &amp; drop assets here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedFolder
                  ? `Uploading into "${selectedFolder.name}".`
                  : "Select a folder to upload assets into."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <label className="cursor-pointer rounded-md bg-primary-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-primary-700">
                  Browse files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleSelectFiles}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setPendingUploads([])}
                >
                  Clear queue
                </button>
              </div>
            </div>

            {pendingUploads.length ? (
              <div className="mt-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pending uploads
                </p>
                <div className="space-y-3">
                  {pendingUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="h-24 w-full overflow-hidden rounded-md bg-slate-100 md:w-44">
                          {upload.preview.startsWith("data:image") ? (
                            <img
                              src={upload.preview}
                              alt={upload.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                              Preview unavailable
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                              value={upload.name}
                              onChange={(event) =>
                                updatePendingUpload(upload.id, (item) => ({
                                  ...item,
                                  name: event.target.value,
                                }))
                              }
                              placeholder="Asset name"
                            />
                            <button
                              type="button"
                              onClick={() => removePendingUpload(upload.id)}
                              className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                              aria-label="Remove pending upload"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            placeholder="Notes for collaborators"
                            value={upload.description}
                            onChange={(event) =>
                              updatePendingUpload(upload.id, (item) => ({
                                ...item,
                                description: event.target.value,
                              }))
                            }
                          />
                          <div>
                            <CreatableSelect
                              isMulti
                              isDisabled={isFetchingTags}
                              value={tagOptions.filter((option) =>
                                upload.tags.includes(option.value),
                              )}
                              options={tagOptions}
                              placeholder="Label with shared tags"
                              classNamePrefix="select"
                              onCreateOption={(label) =>
                                handleCreateTagOption(label, upload.id)
                              }
                              onChange={(items) =>
                                updatePendingUpload(upload.id, (item) => ({
                                  ...item,
                                  tags: items.map((option) => option.value),
                                }))
                              }
                            />
                            <p className="mt-1 text-xs text-slate-400">
                              Tags help your storyboard, scenario, and messaging
                              teams find the right asset. New tags sync for the
                              whole team.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{(upload.file.size / 1024).toFixed(1)} KB</span>
                          <span>*</span>
                          <span>{upload.file.type || "Unknown format"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUploadPending(upload)}
                          disabled={upload.status === "uploading"}
                          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
                        >
                          <UploadCloud size={16} />
                          {upload.status === "uploading"
                            ? "Uploading..."
                            : "Upload asset"}
                        </button>
                      </div>
                      {upload.error ? (
                        <p className="mt-2 text-xs text-red-500">{upload.error}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="text-primary-500" size={18} />
                <p className="text-sm font-semibold text-slate-800">
                  Library Search
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="search"
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Search by name or description"
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                />
                <Select
                  isMulti
                  placeholder="Filter tags"
                  className="md:w-72"
                  classNamePrefix="select"
                  options={tagOptions}
                  value={tagOptions.filter((option) =>
                    tagFilter.includes(option.value),
                  )}
                  onChange={(items) =>
                    setTagFilter(items.map((option) => option.value))
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loadingState ? (
                <div className="col-span-full rounded-md border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Loading asset library...
                </div>
              ) : null}
              {folderError || assetError ? (
                <div className="col-span-full rounded-md border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
                  Unable to load assets right now. Please refresh or try again
                  later.
                </div>
              ) : null}

              {!loadingState && filteredAssets.length === 0 ? (
                <div className="col-span-full rounded-md border border-slate-100 bg-slate-50 p-10 text-center text-sm text-slate-500">
                  No assets match the current filters. Drag files in above or
                  adjust your filters to browse the library.
                </div>
              ) : null}

              {filteredAssets.map((asset) => {
                const tagChips =
                  asset.tags?.map((assignment) => assignment.tag) ?? [];
                const autoSuggestions = Array.isArray(
                  asset.autoTags?.suggestions,
                )
                  ? asset.autoTags?.suggestions ?? []
                  : [];
                return (
                  <article
                    key={asset.id}
                    className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative h-40 w-full overflow-hidden rounded-md bg-slate-100">
                      {asset.previewURL && asset.previewURL.startsWith("data:image") ? (
                        <img
                          src={asset.previewURL}
                          alt={asset.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                          Preview unavailable
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {asset.name}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">
                          {asset.mimeType?.split("/")[1] ?? "file"}
                        </span>
                      </div>
                      {asset.description ? (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {asset.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        {tagChips.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700"
                          >
                            {tag.labelEn}
                          </span>
                        ))}
                        {autoSuggestions.map((suggestion) => (
                          <span
                            key={`auto-${suggestion.key}`}
                            className="rounded-full border border-dashed border-primary-200 px-3 py-1 text-xs text-primary-500"
                          >
                            #{suggestion.key}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FolderIcon size={14} />
                          {asset.folder?.name ?? "Library root"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Link2 size={14} />
                          {asset.linkCount ?? 0} project links
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AssetWorkspace;

