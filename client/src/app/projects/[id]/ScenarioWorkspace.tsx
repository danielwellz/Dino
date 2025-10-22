"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScenarioBlock,
  ScenarioBlockType,
  ScenarioDocument,
  StoryboardFrame,
  Task,
} from "@/app/types/types";
import {
  useAddScenarioBlockMutation,
  useCreateScenarioMutation,
  useGetProjectTasksQuery,
  useGetScenariosQuery,
  useGetStoryboardsQuery,
  useUpdateScenarioBlockMutation,
} from "@/state/api";
import { Link2, MessageSquare, RefreshCw, Sparkles } from "lucide-react";

type PresenceState = {
  user: string;
  status: "editing" | "viewing";
  timestamp: number;
};

const presenceChannelName = (projectId: string) =>
  `scenario-presence-${projectId}`;

const ScenarioWorkspace = ({ projectId }: { projectId: string }) => {
  const numericProjectId = Number(projectId);
  const {
    data,
    isLoading,
    refetch,
  } = useGetScenariosQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );
  const { data: taskData } = useGetProjectTasksQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );
  const { data: storyboardData } = useGetStoryboardsQuery(
    { projectId },
    { skip: Number.isNaN(numericProjectId) },
  );
  const [createScenario, { isLoading: creatingScenario }] =
    useCreateScenarioMutation();
  const [addBlock] = useAddScenarioBlockMutation();
  const [updateBlock] = useUpdateScenarioBlockMutation();

  const scenarios = data?.scenarios ?? [];
  const tasks = taskData ?? [];
  const frames =
    storyboardData?.storyboards?.flatMap((board) => board.frames ?? []) ?? [];

  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(
    null,
  );
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioSummary, setScenarioSummary] = useState("");

  const [blockType, setBlockType] = useState<ScenarioBlockType>(
    ScenarioBlockType.ACTION,
  );
  const [blockHeading, setBlockHeading] = useState("");
  const [blockBody, setBlockBody] = useState("");
  const [blockTaskId, setBlockTaskId] = useState<number | null>(null);
  const [blockFrameId, setBlockFrameId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;

  const sortedBlocks = useMemo(() => {
    if (!selectedScenario) {
      return [];
    }
    return [...(selectedScenario.blocks ?? [])].sort(
      (a, b) => a.order - b.order,
    );
  }, [selectedScenario]);

  useEffect(() => {
    if (!selectedScenarioId && scenarios.length) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenarioId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.BroadcastChannel === "undefined"
    ) {
      return;
    }
    const channel = new window.BroadcastChannel(presenceChannelName(projectId));
    const user = `editor-${Math.floor(Math.random() * 9999)}`;
    const heartbeat = () => {
      const payload: PresenceState = {
        user,
        status: "editing",
        timestamp: Date.now(),
      };
      channel.postMessage(payload);
    };
    const interval = window.setInterval(heartbeat, 4000);
    heartbeat();

    channel.onmessage = (event) => {
      const message = event.data as PresenceState;
      setPresence((prev) => ({
        ...prev,
        [message.user]: {
          user: message.user,
          status: message.status,
          timestamp: message.timestamp,
        },
      }));
    };

    return () => {
      window.clearInterval(interval);
      channel.close();
    };
  }, [projectId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPresence((prev) => {
        const now = Date.now();
        return Object.fromEntries(
          Object.entries(prev).filter(
            ([, value]) => now - value.timestamp < 12000,
          ),
        );
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const setToast = (message: string) => {
    setFeedback(message);
  };

  const handleCreateScenario = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scenarioTitle.trim()) {
      setToast("Scenario title is required.");
      return;
    }
    try {
      const result = await createScenario({
        projectId: numericProjectId,
        title: scenarioTitle.trim(),
        summary: scenarioSummary.trim() || undefined,
      }).unwrap();
      setScenarioTitle("");
      setScenarioSummary("");
      setSelectedScenarioId(result.scenario.id);
      setToast(`Scenario "${result.scenario.title}" created.`);
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to create scenario.");
    }
  };

  const handleAddBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedScenario) {
      setToast("Select a scenario to add blocks.");
      return;
    }
    try {
      await addBlock({
        scenarioId: selectedScenario.id,
        type: blockType,
        heading: blockHeading.trim() || undefined,
        body: blockBody.trim() || undefined,
        linkedTaskId: blockTaskId ?? undefined,
        linkedFrameId: blockFrameId ?? undefined,
        metadata: {
          assistant: "ai-script-assistant-placeholder",
        },
      }).unwrap();
      setBlockBody("");
      setBlockHeading("");
      setBlockTaskId(null);
      setBlockFrameId(null);
      setToast("Scenario block appended.");
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to add block.");
    }
  };

  const handleBlockUpdate = async (
    block: ScenarioBlock,
    changes: Partial<ScenarioBlock>,
  ) => {
    if (!selectedScenario) {
      return;
    }
    try {
      await updateBlock({
        scenarioId: selectedScenario.id,
        blockId: block.id,
        heading:
          "heading" in changes ? changes.heading ?? undefined : undefined,
        body: "body" in changes ? changes.body ?? undefined : undefined,
        linkedTaskId:
          "linkedTaskId" in changes ? changes.linkedTaskId ?? null : undefined,
        linkedFrameId:
          "linkedFrameId" in changes
            ? changes.linkedFrameId ?? null
            : undefined,
      }).unwrap();
    } catch (error: any) {
      setToast(error?.data?.message ?? "Unable to update block.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoTile
          icon={<MessageSquare className="text-primary-500" size={24} />}
          title="Scenarios"
          value={scenarios.length}
          caption="Draft scripts and narrative flows that sync with boards and tasks."
        />
        <InfoTile
          icon={<Sparkles className="text-primary-500" size={24} />}
          title="Blocks"
          value={selectedScenario?.blocks?.length ?? 0}
          caption="Beat by beat breakdown. Inline AI suggestions appear here when enabled."
        />
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            <RefreshCw size={16} />
            Refresh scripts
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Pull the latest edits from collaborators. Presence indicator updates
            every few seconds.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          {feedback}
        </div>
      ) : null}

      <form
        onSubmit={handleCreateScenario}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <div className="text-sm font-semibold text-slate-800">
          Create scenario
        </div>
        <div className="md:col-span-3 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={scenarioTitle}
            onChange={(event) => setScenarioTitle(event.target.value)}
            placeholder="Launch event script"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <input
            type="text"
            value={scenarioSummary}
            onChange={(event) => setScenarioSummary(event.target.value)}
            placeholder="Tease, product beat, CTA"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            disabled={creatingScenario}
            className="rounded-md bg-secondary-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-secondary-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {creatingScenario ? "Creating..." : "New scenario"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Scenarios</h3>
          <p className="mt-1 text-xs text-slate-500">
            Switch between scripts or treatment drafts.
          </p>
          <div className="mt-3 space-y-2">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  scenario.id === selectedScenarioId
                    ? "bg-primary-50 text-primary-700"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="font-medium">{scenario.title}</div>
                <div className="text-xs text-slate-500">
                  {scenario.blocks?.length ?? 0} beats
                </div>
              </button>
            ))}
          </div>
          <PresencePanel presence={presence} />
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">
              Add block
            </h4>
            <select
              value={blockType}
              onChange={(event) =>
                setBlockType(event.target.value as ScenarioBlockType)
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {Object.values(ScenarioBlockType).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={blockHeading}
              onChange={(event) => setBlockHeading(event.target.value)}
              placeholder="Beat heading"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <textarea
              rows={4}
              value={blockBody}
              onChange={(event) => setBlockBody(event.target.value)}
              placeholder="Action, dialog, or narration notes"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <select
              value={blockTaskId ?? ""}
              onChange={(event) =>
                setBlockTaskId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Link to task (optional)</option>
              {tasks.map((task: Task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <select
              value={blockFrameId ?? ""}
              onChange={(event) =>
                setBlockFrameId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Link to storyboard frame (optional)</option>
              {frames.map((frame) => (
                <option key={frame.id} value={frame.id}>
                  Frame {frame.order}: {frame.title ?? "Untitled"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddBlock}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Append block
            </button>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          {selectedScenario ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedScenario.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedScenario.summary}
                  </p>
                </div>
              </header>
              <div className="space-y-4">
                {sortedBlocks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Add your first beat to outline the flow of this scenario.
                  </div>
                ) : (
                  sortedBlocks.map((block) => (
                    <ScenarioBlockCard
                      key={block.id}
                      block={block}
                      onUpdate={handleBlockUpdate}
                      tasks={tasks}
                      frames={frames}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Select or create a scenario to begin editing.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const InfoTile = ({
  icon,
  title,
  value,
  caption,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  caption: string;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
      {icon}
    </div>
    <p className="mt-2 text-xs text-slate-500">{caption}</p>
  </div>
);

const PresencePanel = ({
  presence,
}: {
  presence: Record<string, PresenceState>;
}) => {
  const activeUsers = Object.values(presence);
  if (activeUsers.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        No other editors detected right now.
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
      <div className="font-semibold">Live editors</div>
      <ul className="mt-1 space-y-1">
        {activeUsers.map((user) => (
          <li key={user.user} className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary-500" />
            <span>{user.user}</span>
            <span className="text-[11px] uppercase tracking-wide">
              {user.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

type ScenarioBlockCardProps = {
  block: ScenarioBlock;
  onUpdate: (block: ScenarioBlock, changes: Partial<ScenarioBlock>) => void;
  tasks: Task[];
  frames: StoryboardFrame[];
};

const ScenarioBlockCard = ({
  block,
  onUpdate,
  tasks,
  frames,
}: ScenarioBlockCardProps) => {
  const [heading, setHeading] = useState(block.heading ?? "");
  const [body, setBody] = useState(block.body ?? "");
  const blockMetadata =
    (block.metadata as { updatedAt?: string | number } | null) ?? null;
  const lastUpdated =
    blockMetadata?.updatedAt !== undefined
      ? new Date(blockMetadata.updatedAt).toLocaleTimeString()
      : "";

  useEffect(() => {
    setHeading(block.heading ?? "");
    setBody(block.body ?? "");
  }, [block.heading, block.body]);

  const handleBlur = () => {
    if (heading !== (block.heading ?? "") || body !== (block.body ?? "")) {
      onUpdate(block, { heading, body });
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
        <span>
          {block.order}. {block.type}
        </span>
        <span>{lastUpdated}</span>
      </div>
      <input
        type="text"
        value={heading}
        onChange={(event) => setHeading(event.target.value)}
        onBlur={handleBlur}
        placeholder="Beat heading"
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
      <textarea
        rows={6}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={handleBlur}
        placeholder="Describe the action or dialog for this beat."
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Link2 size={14} />
          {block.linkedTaskId
            ? `Task #${block.linkedTaskId}`
            : "No task linked"}
        </span>
        <span className="flex items-center gap-1">
          <Link2 size={14} />
          {block.linkedFrameId
            ? `Frame #${block.linkedFrameId}`
            : "No frame linked"}
        </span>
        <button
          type="button"
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          onClick={() =>
            onUpdate(block, {
              linkedTaskId: block.linkedTaskId ? null : tasks[0]?.id ?? null,
            })
          }
        >
          Toggle task link
        </button>
        <button
          type="button"
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          onClick={() =>
            onUpdate(block, {
              linkedFrameId: block.linkedFrameId ? null : frames[0]?.id ?? null,
            })
          }
        >
          Toggle frame link
        </button>
      </div>
    </div>
  );
};

export default ScenarioWorkspace;
