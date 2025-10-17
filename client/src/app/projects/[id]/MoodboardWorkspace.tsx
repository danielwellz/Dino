"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Moodboard,
  MoodboardItem,
  MoodboardItemType,
} from "@/app/types/types";
import {
  useAddMoodboardItemMutation,
  useCreateMoodboardMutation,
  useGetMoodboardsQuery,
  useUpdateMoodboardItemMutation,
} from "@/state/api";
import {
  ImageIcon,
  LayoutGrid,
  Palette,
  Plus,
  RefreshCw,
  Sparkles,
  StickyNote,
} from "lucide-react";

type MoodboardWorkspaceProps = {
  projectId: string;
  teamId?: number;
};

type DragState = {
  id: number;
  offsetX: number;
  offsetY: number;
};

type LocalPosition = Record<
  number,
  {
    x: number;
    y: number;
  }
>;

const defaultBoardMeta = (title: string) => ({
  title,
  description:
    "Organize references, inspiration, and concept art with real time handoffs.",
});

const MoodboardWorkspace = ({ projectId }: MoodboardWorkspaceProps) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const numericProjectId = Number(projectId);

  const {
    data,
    isFetching,
    isLoading,
    refetch,
  } = useGetMoodboardsQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );

  const [createMoodboard, { isLoading: isCreatingBoard }] =
    useCreateMoodboardMutation();
  const [addMoodboardItem, { isLoading: isSavingItem }] =
    useAddMoodboardItemMutation();
  const [updateMoodboardItem] = useUpdateMoodboardItemMutation();

  const boards = data?.moodboards ?? [];
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [noteText, setNoteText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [colorSwatch, setColorSwatch] = useState("#f97316");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [localPositions, setLocalPositions] = useState<LocalPosition>({});

  useEffect(() => {
    if (!selectedBoardId && boards.length) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  );

  const items = selectedBoard?.items ?? [];

  const showEmptyState = !isLoading && !isFetching && boards.length === 0;

  const reportFeedback = (message: string) => {
    setFeedback(message);
  };

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!boardTitle.trim()) {
      reportFeedback("Board title is required.");
      return;
    }
    try {
      const result = await createMoodboard({
        projectId: numericProjectId,
        title: boardTitle.trim(),
        description: boardDescription.trim() || undefined,
        isShared: true,
      }).unwrap();
      setBoardTitle("");
      setBoardDescription("");
      setSelectedBoardId(result.moodboard.id);
      reportFeedback(`Moodboard "${result.moodboard.title}" created.`);
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to create moodboard.");
    }
  };

  const resolveCanvasPosition = (event: {
    clientX: number;
    clientY: number;
  }) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const handleDropFile = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedBoard) {
      reportFeedback("Select a moodboard to add items.");
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      const url = event.dataTransfer.getData("text/uri-list");
      if (url) {
        await handleAddEmbed(url);
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      reportFeedback("Only image files can be dropped on the canvas.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const preview = reader.result as string;
      const position = resolveCanvasPosition(event);
      try {
        await addMoodboardItem({
          moodboardId: selectedBoard.id,
          type: MoodboardItemType.IMAGE,
          contentURL: preview,
          thumbnailURL: preview,
          positionX: position.x,
          positionY: position.y,
          width: 220,
          height: 220,
        }).unwrap();
        reportFeedback("Image added to the moodboard.");
      } catch (error: any) {
        reportFeedback(error?.data?.message ?? "Could not add image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNote = async () => {
    if (!selectedBoard || !noteText.trim()) {
      reportFeedback("Write a note before adding it to the board.");
      return;
    }
    try {
      await addMoodboardItem({
        moodboardId: selectedBoard.id,
        type: MoodboardItemType.NOTE,
        note: noteText.trim(),
        positionX: 64 + items.length * 24,
        positionY: 64 + items.length * 18,
        width: 220,
        height: 180,
        metadata: {
          sentiment: "aiAssistantIncoming",
        },
      }).unwrap();
      setNoteText("");
      reportFeedback("Note added to moodboard.");
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to add note.");
    }
  };

  const handleAddImage = async () => {
    if (!selectedBoard || !imageUrl.trim()) {
      reportFeedback("Provide an image URL to add it to the board.");
      return;
    }
    try {
      await addMoodboardItem({
        moodboardId: selectedBoard.id,
        type: MoodboardItemType.IMAGE,
        contentURL: imageUrl.trim(),
        thumbnailURL: imageUrl.trim(),
        positionX: 84 + items.length * 16,
        positionY: 84 + items.length * 20,
      }).unwrap();
      setImageUrl("");
      reportFeedback("Image reference stored.");
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to add image URL.");
    }
  };

  const handleAddEmbed = async (url: string) => {
    if (!selectedBoard) {
      reportFeedback("Select a moodboard to add embeds.");
      return;
    }
    if (!url.trim()) {
      reportFeedback("Paste a valid embed URL.");
      return;
    }
    try {
      await addMoodboardItem({
        moodboardId: selectedBoard.id,
        type: MoodboardItemType.EMBED,
        contentURL: url.trim(),
        positionX: 96 + items.length * 12,
        positionY: 96 + items.length * 12,
        metadata: {
          provider: url.includes("figma")
            ? "figma"
            : url.includes("milantor")
              ? "milantor"
              : "link",
        },
      }).unwrap();
      setEmbedUrl("");
      reportFeedback("Embed link added.");
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to add embed.");
    }
  };

  const handleAddColor = async () => {
    if (!selectedBoard) {
      reportFeedback("Select a moodboard to add color swatches.");
      return;
    }
    try {
      await addMoodboardItem({
        moodboardId: selectedBoard.id,
        type: MoodboardItemType.COLOR,
        note: colorSwatch,
        positionX: 64 + items.length * 28,
        positionY: 160 + items.length * 12,
        metadata: {
          hex: colorSwatch,
        },
      }).unwrap();
      reportFeedback("Color swatch added.");
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to add color swatch.");
    }
  };

  const getDisplayPosition = (item: MoodboardItem) => {
    const local = localPositions[item.id];
    return {
      x: local?.x ?? item.positionX,
      y: local?.y ?? item.positionY,
    };
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    item: MoodboardItem,
  ) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const { x, y } = getDisplayPosition(item);
    const startX = event.clientX;
    const startY = event.clientY;
    const nextState: DragState = {
      id: item.id,
      offsetX: startX - x,
      offsetY: startY - y,
    };
    setDragState(nextState);
    dragRef.current = nextState;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const active = dragRef.current;
    if (!active) {
      return;
    }
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = event.clientX - bounds.left - active.offsetX;
    const y = event.clientY - bounds.top - active.offsetY;
    setLocalPositions((prev) => ({
      ...prev,
      [active.id]: { x, y },
    }));
  };

  const handlePointerUp = async () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    const active = dragRef.current;
    if (!active || !selectedBoard) {
      setDragState(null);
      dragRef.current = null;
      return;
    }
    const latest = localPositions[active.id];
    if (!latest) {
      setDragState(null);
      dragRef.current = null;
      return;
    }
    try {
      await updateMoodboardItem({
        moodboardId: selectedBoard.id,
        itemId: active.id,
        positionX: latest.x,
        positionY: latest.y,
      }).unwrap();
    } catch (error: any) {
      reportFeedback(error?.data?.message ?? "Unable to move card.");
    } finally {
      setDragState(null);
      dragRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Boards
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {boards.length}
              </p>
            </div>
            <LayoutGrid className="text-primary-500" size={24} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Capture visual direction with boards for concepts, talent, or
            references.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Cards
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {items.length}
              </p>
            </div>
            <Sparkles className="text-primary-500" size={24} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Drag cards to rearrange. AI tagging suggestions surface here once
            connected.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            <RefreshCw size={16} />
            Refresh workspace
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Pull the latest updates made by collaborators.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          {feedback}
        </div>
      ) : null}

      <form
        onSubmit={handleCreateBoard}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <div className="md:col-span-1 text-sm font-semibold text-slate-800">
          Create moodboard
        </div>
        <div className="md:col-span-3 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder={defaultBoardMeta("Storyboard palette").title}
            value={boardTitle}
            onChange={(event) => setBoardTitle(event.target.value)}
          />
          <input
            type="text"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder={defaultBoardMeta("Storyboard palette").description}
            value={boardDescription}
            onChange={(event) => setBoardDescription(event.target.value)}
          />
          <button
            type="submit"
            disabled={isCreatingBoard}
            className="flex items-center gap-2 rounded-md bg-secondary-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Plus size={16} />
            {isCreatingBoard ? "Creating..." : "New board"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">
            Boards in project
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Switch boards to focus on a different concept track.
          </p>
          <div className="mt-3 space-y-2">
            {showEmptyState ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                Create your first board to start pinning references.
              </div>
            ) : null}
            {boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoardId(board.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  board.id === selectedBoardId
                    ? "bg-primary-50 text-primary-700"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="font-medium">{board.title}</div>
                <div className="text-xs text-slate-500">
                  {board.items?.length ?? 0} cards -{" "}
                  {new Date(board.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <StickyNote size={16} />
              Add quick note
            </div>
            <textarea
              rows={3}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="button"
              onClick={handleAddNote}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Save note
            </button>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ImageIcon size={16} />
              Add image by URL
            </div>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://cdn..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Add image
            </button>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Palette size={16} />
              Color swatch
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorSwatch}
                onChange={(event) => setColorSwatch(event.target.value)}
                className="h-10 w-12 rounded-md border border-slate-200 p-0"
              />
              <span className="text-xs text-slate-500">{colorSwatch}</span>
            </div>
            <button
              type="button"
              onClick={handleAddColor}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Save swatch
            </button>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Sparkles size={16} />
              Embed link (Figma, Milantor, others)
            </div>
            <input
              type="url"
              value={embedUrl}
              onChange={(event) => setEmbedUrl(event.target.value)}
              placeholder="https://www.figma.com/file/..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="button"
              onClick={() => handleAddEmbed(embedUrl)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Attach embed
            </button>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div
            ref={canvasRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropFile}
            className="relative min-h-[420px] rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
          >
            {selectedBoard ? (
              <>
                {items.map((item) => {
                  const { x, y } = getDisplayPosition(item);
                  return (
                    <div
                      key={item.id}
                      onPointerDown={(event) => handlePointerDown(event, item)}
                      className="absolute cursor-move rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                      style={{
                        left: x,
                        top: y,
                        width: item.width,
                        height: item.height,
                      }}
                    >
                      <MoodboardCard item={item} />
                    </div>
                  );
                })}
                <div className="absolute bottom-4 right-4 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
                  Drop images or paste links directly on the canvas. AI palette
                  suggestions appear on hover when connected.
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
                <p>Select a moodboard to begin arranging references.</p>
                <p>Drag images from your desktop or paste share links here.</p>
              </div>
            )}
          </div>
          {isSavingItem ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
              Uploading asset to the board...
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

type MoodboardCardProps = {
  item: MoodboardItem;
};

const MoodboardCard = ({ item }: MoodboardCardProps) => {
  if (item.type === MoodboardItemType.NOTE) {
    return (
      <div className="flex h-full flex-col gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">
        <div className="font-semibold">Note</div>
        <p className="text-xs leading-snug text-amber-900">{item.note}</p>
      </div>
    );
  }

  if (item.type === MoodboardItemType.COLOR) {
    const color = (item.metadata as { hex?: string } | null)?.hex ?? item.note;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 py-3">
        <div
          className="h-20 w-20 rounded-full border border-slate-200"
          style={{ backgroundColor: color ?? "#000000" }}
        />
        <span className="text-xs text-slate-600">{color}</span>
      </div>
    );
  }

  if (item.type === MoodboardItemType.EMBED && item.contentURL) {
    return (
      <iframe
        src={item.contentURL}
        title="Embed"
        className="h-full w-full rounded-lg border-0"
        allow="fullscreen"
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-slate-100">
      {item.contentURL ? (
        <img
          src={item.contentURL}
          alt={item.note ?? item.contentURL}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
          Drop media to preview
        </div>
      )}
    </div>
  );
};

export default MoodboardWorkspace;
