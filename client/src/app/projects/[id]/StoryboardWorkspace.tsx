"use client";

import { useMemo, useState } from "react";
import { Storyboard, StoryboardFrame } from "@/app/types/types";
import {
  useAddStoryboardFrameMutation,
  useCreateStoryboardMutation,
  useGetProjectTasksQuery,
  useGetStoryboardsQuery,
  useUpdateStoryboardFrameMutation,
} from "@/state/api";
import {
  Clock,
  Film,
  Link2,
  Notebook,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type StoryboardWorkspaceProps = {
  projectId: string;
};

const StoryboardWorkspace = ({ projectId }: StoryboardWorkspaceProps) => {
  const numericProjectId = Number(projectId);
  const { data, isLoading, refetch } = useGetStoryboardsQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );
  const { data: taskData } = useGetProjectTasksQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );
  const [createStoryboard, { isLoading: creatingBoard }] =
    useCreateStoryboardMutation();
  const [addFrame, { isLoading: creatingFrame }] =
    useAddStoryboardFrameMutation();
  const [updateFrame] = useUpdateStoryboardFrameMutation();

  const storyboards = data?.storyboards ?? [];
  const tasks = taskData ?? [];

  const [selectedStoryboardId, setSelectedStoryboardId] = useState<
    number | null
  >(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [frameTitle, setFrameTitle] = useState("");
  const [frameDescription, setFrameDescription] = useState("");
  const [frameImage, setFrameImage] = useState("");
  const [frameTaskId, setFrameTaskId] = useState<number | null>(null);
  const [frameDuration, setFrameDuration] = useState<number | null>(null);
  const [embedUrl, setEmbedUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedStoryboard =
    storyboards.find((board) => board.id === selectedStoryboardId) ?? null;

  const sortedFrames = useMemo(() => {
    if (!selectedStoryboard) {
      return [];
    }
    return [...(selectedStoryboard.frames ?? [])].sort(
      (a, b) => a.order - b.order,
    );
  }, [selectedStoryboard]);

  const totalDuration = sortedFrames.reduce(
    (sum, frame) => sum + (frame.duration ?? 0),
    0,
  );

  const setToast = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2600);
  };

  const handleCreateStoryboard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setToast("Storyboard title is required.");
      return;
    }
    try {
      const result = await createStoryboard({
        projectId: numericProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
      }).unwrap();
      setTitle("");
      setDescription("");
      setSelectedStoryboardId(result.storyboard.id);
      setToast(`Storyboard "${result.storyboard.title}" created.`);
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to create storyboard.");
    }
  };

  const resolveEmbedMetadata = (url: string) => {
    if (!url) {
      return undefined;
    }
    return {
      embedUrl: url,
      provider: url.includes("figma")
        ? "figma"
        : url.includes("milantor")
          ? "milantor"
          : "link",
    } as Record<string, unknown>;
  };

  const handleCreateFrame = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStoryboard) {
      setToast("Select a storyboard to add frames.");
      return;
    }
    try {
      await addFrame({
        storyboardId: selectedStoryboard.id,
        title: frameTitle.trim() || undefined,
        description: frameDescription.trim() || undefined,
        imageURL: frameImage.trim() || undefined,
        taskId: frameTaskId ?? undefined,
        duration: frameDuration ?? undefined,
        metadata: resolveEmbedMetadata(embedUrl.trim()),
      }).unwrap();
      setFrameTitle("");
      setFrameDescription("");
      setFrameImage("");
      setFrameTaskId(null);
      setFrameDuration(null);
      setEmbedUrl("");
      setToast("Frame added to storyboard.");
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to add frame.");
    }
  };

  const handleMoveFrame = async (frame: StoryboardFrame, delta: number) => {
    if (!selectedStoryboard) {
      return;
    }
    const nextOrder = frame.order + delta;
    if (nextOrder < 1) {
      return;
    }
    try {
      await updateFrame({
        storyboardId: selectedStoryboard.id,
        frameId: frame.id,
        order: nextOrder,
      }).unwrap();
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to reorder frame.");
    }
  };

  const handleUpdateDuration = async (
    frame: StoryboardFrame,
    duration: number,
  ) => {
    if (!selectedStoryboard) {
      return;
    }
    try {
      await updateFrame({
        storyboardId: selectedStoryboard.id,
        frameId: frame.id,
        duration,
      }).unwrap();
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to update duration.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Storyboards
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {storyboards.length}
              </p>
            </div>
            <Film className="text-primary-500" size={24} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Each board lights up a slice of production: mood, scene, or
            campaign touchpoint.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Frames
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {sortedFrames.length}
              </p>
            </div>
            <Notebook className="text-primary-500" size={24} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Link frames back to delivery tasks and creative assets so producers
            stay in sync.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total Duration
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {totalDuration} sec
              </p>
            </div>
            <Clock className="text-primary-500" size={24} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Use frame durations to rough in pacing before formal script timing.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          {feedback}
        </div>
      ) : null}

      <form
        onSubmit={handleCreateStoryboard}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <div className="text-sm font-semibold text-slate-800">
          Create storyboard
        </div>
        <div className="md:col-span-3 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Campaign hero storyboard"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Act 1 through launch hero scenes"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            disabled={creatingBoard}
            className="rounded-md bg-secondary-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {creatingBoard ? "Creating..." : "New storyboard"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">
            Storyboards
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Switch boards to refine different sequences or scenes.
          </p>
          <div className="mt-3 space-y-2">
            {storyboards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedStoryboardId(board.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  board.id === selectedStoryboardId
                    ? "bg-primary-50 text-primary-700"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="font-medium">{board.title}</div>
                <div className="text-xs text-slate-500">
                  {board.frames?.length ?? 0} frames -{" "}
                  {new Date(board.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => refetch()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">
              Add frame
            </h4>
            <input
              type="text"
              value={frameTitle}
              onChange={(event) => setFrameTitle(event.target.value)}
              placeholder="Frame title"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <textarea
              rows={3}
              value={frameDescription}
              onChange={(event) => setFrameDescription(event.target.value)}
              placeholder="Action, camera notes, or VO details"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <input
              type="url"
              value={frameImage}
              onChange={(event) => setFrameImage(event.target.value)}
              placeholder="Reference image URL"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <select
              value={frameTaskId ?? ""}
              onChange={(event) =>
                setFrameTaskId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Link to task (optional)</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={frameDuration ?? ""}
                onChange={(event) =>
                  setFrameDuration(
                    event.target.value
                      ? Number.parseInt(event.target.value, 10)
                      : null,
                  )
                }
                placeholder="Duration (seconds)"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <input
              type="url"
              value={embedUrl}
              onChange={(event) => setEmbedUrl(event.target.value)}
              placeholder="Figma or Milantor embed link"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="button"
              onClick={handleCreateFrame}
              disabled={creatingFrame}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {creatingFrame ? "Saving..." : "Add frame"}
            </button>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {selectedStoryboard ? (
              <div className="flex min-w-full gap-4">
                {sortedFrames.length === 0 ? (
                  <div className="flex h-32 flex-1 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    Add frames to start mapping this sequence.
                  </div>
                ) : (
                  sortedFrames.map((frame) => (
                    <FrameCard
                      key={frame.id}
                      frame={frame}
                      onMove={handleMoveFrame}
                      onDurationChange={handleUpdateDuration}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                Select a storyboard to view frames.
              </div>
            )}
          </div>
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-3 text-xs text-primary-700">
            <Sparkles className="mb-1 inline-block" size={14} />
            {" "}
            Story and timing assistant hooks in here. Connect an LLM or script
            service to auto-generate beat suggestions from frames.
          </div>
        </section>
      </div>
    </div>
  );
};

type FrameCardProps = {
  frame: StoryboardFrame;
  onMove: (frame: StoryboardFrame, delta: number) => void;
  onDurationChange: (frame: StoryboardFrame, duration: number) => void;
};

const FrameCard = ({ frame, onMove, onDurationChange }: FrameCardProps) => {
  const metadata = (frame.metadata as Record<string, unknown> | null) ?? {};
  const embedUrl = typeof metadata.embedUrl === "string" ? metadata.embedUrl : "";
  return (
    <div className="flex min-w-[240px] flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Frame {frame.order}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMove(frame, -1)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => onMove(frame, 1)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            {">"}
          </button>
        </div>
      </div>
      {frame.imageURL ? (
        <img
          src={frame.imageURL}
          alt={frame.title ?? "Storyboard frame"}
          className="h-32 w-full rounded-md object-cover"
        />
      ) : embedUrl ? (
        <iframe
          src={embedUrl}
          title={`Storyboard embed ${frame.id}`}
          className="h-32 w-full rounded-md border-0"
          allow="fullscreen"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-500">
          Attach an image or embed reference.
        </div>
      )}
      <div>
        <h5 className="text-sm font-semibold text-slate-800">
          {frame.title ?? "Untitled frame"}
        </h5>
        <p className="text-xs text-slate-500">{frame.description}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Link2 size={14} />
          {frame.taskId ? `Task #${frame.taskId}` : "No task linked"}
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <input
            type="number"
            min={0}
            value={frame.duration ?? ""}
            onChange={(event) =>
              onDurationChange(
                frame,
                event.target.value
                  ? Number.parseInt(event.target.value, 10)
                  : 0,
              )
            }
            className="w-16 rounded border border-slate-200 px-1 py-0.5 text-xs"
          />
          sec
        </div>
      </div>
    </div>
  );
};

export default StoryboardWorkspace;
