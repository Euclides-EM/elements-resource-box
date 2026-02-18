import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  feature_ExecutionStrategy,
  feature_Feature,
  feature_Revision,
  FeatureRevisionsService,
  FeaturesService,
} from "../../../hub-api";
import { TITLE_PAGES_DATASET_ID } from "../../constants";

type FeatureEditState = {
  name: string;
  description: string;
};

type RevisionFormState = {
  execution_strategy: feature_ExecutionStrategy;
  prompt: string;
  regex: string;
  note: string;
};

const PageContainer = styled.div`
  padding: 1.5rem;
  width: 100%;
  margin: 1.5rem auto;
  max-width: min(1200px, 100vw - 4rem);
  min-height: calc(100vh - 120px);
  color: black;
  background-color: aliceblue;
  border-radius: 1rem;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  color: #333;
`;

const Card = styled.div`
  background-color: #fdfdfd;
  border: 1px solid #e3e3e3;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  color: #555;
  font-weight: 600;
`;

const Input = styled.input`
  padding: 0.55rem 0.65rem;
  border: 1px solid #dcdcdc;
  border-radius: 0.4rem;
  background-color: #fafafa;
  color: black;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }
`;

const SearchInput = styled(Input)`
  width: 100%;
  max-width: 520px;
`;

const TextArea = styled.textarea`
  padding: 0.55rem 0.65rem;
  border: 1px solid #dcdcdc;
  border-radius: 0.4rem;
  background-color: #fafafa;
  color: black;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }
`;

const Select = styled.select`
  padding: 0.55rem 0.65rem;
  border: 1px solid #dcdcdc;
  border-radius: 0.4rem;
  background-color: #fafafa;
  color: black;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #74b9ff;
    background-color: white;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const CollapseButton = styled.button`
  border: none;
  background: transparent;
  color: #2c3e50;
  border-radius: 999px;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #eef3f9;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Button = styled.button<{
  variant?: "primary" | "danger" | "ghost" | "outline";
}>`
  padding: 0.5rem 1rem;
  min-width: 6.5rem;
  text-align: center;
  border-radius: 0.4rem;
  border: 1px solid
    ${({ variant }) => (variant === "outline" ? "#2c3e50" : "transparent")};
  background-color: ${({ variant }) =>
    variant === "danger"
      ? "#c0392b"
      : variant === "outline"
        ? "transparent"
        : variant === "ghost"
          ? "transparent"
          : "#1e88e5"};
  color: ${({ variant }) =>
    variant === "ghost" || variant === "outline" ? "#2c3e50" : "white"};
  ${({ variant }) =>
    variant === "ghost" &&
    `
      color: #2c3e50;
      background-color: #eef3f9;
    `};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FeatureHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FeatureTitle = styled.div<{ clickable?: boolean }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: #222;
  ${({ clickable }) => clickable && "cursor: pointer;"}
`;

const FeatureDescription = styled.div`
  font-size: 0.9rem;
  color: #555;
  line-height: 1.4;
  white-space: pre-wrap;
`;

const FeatureMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FeatureActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const IconButton = styled.span`
  border: none;
  background: transparent;
  color: #2c3e50;
  border-radius: 999px;
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #eef3f9;
  }
`;

const Tag = styled.span`
  background-color: #dde9f5;
  color: #2c3e50;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
`;

const RevisionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
`;

const RevisionHeader = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: -0.5rem;
  cursor: pointer;
`;

const RevisionLabel = styled.span`
  font-size: 0.85rem;
  color: #666;
`;

const RevisionCard = styled.div`
  background-color: #f8fbff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.85rem;
  display: grid;
  gap: 0.4rem;
  position: relative;
`;

const LatestTag = styled(Tag)`
  position: absolute;
  top: 0.6rem;
  right: 0.75rem;
`;
const InlineValue = styled.span`
  color: #333;
  font-weight: 600;
`;

const SmallText = styled.div`
  font-size: 0.8rem;
  color: #666;
`;

const EmptyState = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const ErrorText = styled.div`
  color: #b00020;
  font-size: 0.9rem;
`;

const defaultRevisionForm: RevisionFormState = {
  execution_strategy: "prompt",
  prompt: "",
  regex: "",
  note: "",
};

const getRevisionDefaults = (revision?: {
  execution_strategy?: "prompt" | "regex";
  prompt?: string;
  regex?: string;
  note?: string;
}): RevisionFormState => ({
  execution_strategy: revision?.execution_strategy ?? "prompt",
  prompt: revision?.prompt ?? "",
  regex: revision?.regex ?? "",
  note: revision?.note ?? "",
});

const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const getRevisionPreview = (revision?: string) => {
  if (!revision) {
    return "—";
  }
  if (revision.length <= 160) {
    return revision;
  }
  return `${revision.slice(0, 160)}…`;
};

export function DefinitionsTab() {
  const queryClient = useQueryClient();
  const [featureEdits, setFeatureEdits] = useState<
    Record<string, FeatureEditState>
  >({});
  const [createForm, setCreateForm] = useState<FeatureEditState>({
    name: "",
    description: "",
  });
  const [revisionForms, setRevisionForms] = useState<
    Record<string, RevisionFormState>
  >({});
  const [expandedFeatures, setExpandedFeatures] = useState<
    Record<string, boolean>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFeatureId, setBusyFeatureId] = useState<string | null>(null);
  const [creatingRevisionFeatureId, setCreatingRevisionFeatureId] = useState<
    string | null
  >(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingFeatures, setEditingFeatures] = useState<
    Record<string, boolean>
  >({});
  const [createRevisionOpen, setCreateRevisionOpen] = useState<
    Record<string, boolean>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const featuresQueryKey = [
    "features",
    "definitions",
    TITLE_PAGES_DATASET_ID,
  ] as const;

  const featuresQuery = useQuery({
    queryKey: featuresQueryKey,
    queryFn: () =>
      FeaturesService.getDatasetsFeatures({
        dataSetId: TITLE_PAGES_DATASET_ID,
        expand: ["revisions"],
      }),
    refetchOnWindowFocus: false,
  });
  const features = featuresQuery.data ?? [];

  const sortedFeatures = useMemo(
    () =>
      [...features].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      ),
    [features],
  );

  const filteredFeatures = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedFeatures;
    }
    return sortedFeatures.filter((feature) => {
      const name = feature.name?.toLowerCase() ?? "";
      const description = feature.description?.toLowerCase() ?? "";
      return name.includes(query) || description.includes(query);
    });
  }, [searchQuery, sortedFeatures]);

  useEffect(() => {
    setFeatureEdits((previous) => {
      const next: Record<string, FeatureEditState> = {};
      for (const feature of features) {
        if (!feature.id) {
          continue;
        }
        if (editingFeatures[feature.id] && previous[feature.id]) {
          next[feature.id] = previous[feature.id];
          continue;
        }
        next[feature.id] = {
          name: feature.name || "",
          description: feature.description || "",
        };
      }
      return next;
    });
    setRevisionForms((previous) => {
      const next: Record<string, RevisionFormState> = {};
      for (const feature of features) {
        if (!feature.id) {
          continue;
        }
        next[feature.id] = previous[feature.id] ?? { ...defaultRevisionForm };
      }
      return next;
    });
  }, [features, editingFeatures]);

  const updateFeatureMutation = useMutation({
    mutationFn: ({
      featureId,
      feature,
    }: {
      featureId: string;
      feature: feature_Feature;
    }) =>
      FeaturesService.putDatasetsFeatures({
        dataSetId: TITLE_PAGES_DATASET_ID,
        featureId,
        feature,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: (featureId: string) =>
      FeaturesService.deleteDatasetsFeatures({
        dataSetId: TITLE_PAGES_DATASET_ID,
        featureId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    },
  });

  const createFeatureMutation = useMutation({
    mutationFn: (feature: feature_Feature) =>
      FeaturesService.postDatasetsFeatures({
        dataSetId: TITLE_PAGES_DATASET_ID,
        feature,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: ({
      featureId,
      revision,
    }: {
      featureId: string;
      revision: feature_Revision;
    }) =>
      FeatureRevisionsService.postDatasetsFeaturesRevisions({
        dataSetId: TITLE_PAGES_DATASET_ID,
        featureId,
        revision,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    },
  });

  const queryError =
    featuresQuery.error instanceof Error
      ? featuresQuery.error.message
      : featuresQuery.error
        ? "Failed to load features."
        : null;
  const error = actionError ?? queryError;
  const loading = featuresQuery.isLoading;
  const creatingFeature = createFeatureMutation.isPending;

  const handleUpdateFeature = async (
    feature: feature_Feature,
    event?: React.FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!feature.id) {
      return;
    }
    const form = featureEdits[feature.id];
    if (!form?.name?.trim()) {
      setActionError("Feature name is required.");
      return;
    }
    setBusyFeatureId(feature.id);
    setActionError(null);
    try {
      await updateFeatureMutation.mutateAsync({
        featureId: feature.id,
        feature: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          is_root: feature.is_root ?? false,
          is_default: feature.is_default ?? false,
        },
      });
      setEditingFeatures((prev) => ({
        ...prev,
        [feature.id as string]: false,
      }));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update feature.",
      );
    } finally {
      setBusyFeatureId(null);
    }
  };

  const handleDeleteFeature = async (feature: feature_Feature) => {
    if (!feature.id) {
      return;
    }
    if (!window.confirm(`Delete "${feature.name || "this feature"}"?`)) {
      return;
    }
    setBusyFeatureId(feature.id);
    setActionError(null);
    try {
      await deleteFeatureMutation.mutateAsync(feature.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete feature.",
      );
    } finally {
      setBusyFeatureId(null);
    }
  };

  const handleCancelEdit = (feature: feature_Feature) => {
    if (!feature.id) {
      return;
    }
    setFeatureEdits((prev) => ({
      ...prev,
      [feature.id as string]: {
        name: feature.name || "",
        description: feature.description || "",
      },
    }));
    setEditingFeatures((prev) => ({
      ...prev,
      [feature.id as string]: false,
    }));
  };

  const handleToggleCreateRevision = (
    featureId: string,
    latestRevision?: feature_Revision,
  ) => {
    setCreateRevisionOpen((prev) => {
      const nextOpen = !prev[featureId];
      if (nextOpen) {
        setRevisionForms((current) => {
          const existing = current[featureId];
          if (
            existing &&
            (existing.prompt || existing.regex || existing.note)
          ) {
            return current;
          }
          return {
            ...current,
            [featureId]: getRevisionDefaults(latestRevision),
          };
        });
      }
      return { ...prev, [featureId]: nextOpen };
    });
  };

  const handleCreateFeature = async (
    event?: React.FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!createForm.name.trim()) {
      setActionError("Feature name is required.");
      return;
    }
    setActionError(null);
    try {
      await createFeatureMutation.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        is_root: false,
        is_default: false,
      });
      setCreateForm({ name: "", description: "" });
      setCreateFormOpen(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create feature.",
      );
    }
  };

  const handleCreateRevision = async (
    feature: feature_Feature,
    event?: React.FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!feature.id) {
      return;
    }
    const form = revisionForms[feature.id] ?? defaultRevisionForm;
    if (form.execution_strategy === "prompt" && !form.prompt.trim()) {
      setActionError("Prompt text is required for prompt-based revisions.");
      return;
    }
    if (form.execution_strategy === "regex" && !form.regex.trim()) {
      setActionError("Regex text is required for regex-based revisions.");
      return;
    }
    setCreatingRevisionFeatureId(feature.id);
    setActionError(null);
    const payload: feature_Revision = {
      execution_strategy: form.execution_strategy,
      note: form.note.trim() || undefined,
      prompt:
        form.execution_strategy === "prompt" ? form.prompt.trim() : undefined,
      regex:
        form.execution_strategy === "regex" ? form.regex.trim() : undefined,
    };
    try {
      await createRevisionMutation.mutateAsync({
        featureId: feature.id,
        revision: payload,
      });
      setRevisionForms((prev) => ({
        ...prev,
        [feature.id as string]: { ...defaultRevisionForm },
      }));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create revision.",
      );
    } finally {
      setCreatingRevisionFeatureId(null);
    }
  };

  const toggleExpanded = (featureId?: string) => {
    if (!featureId) {
      return;
    }
    setExpandedFeatures((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  return (
    <PageContainer>
      <PageHeader>
        <Title>Title Page Features</Title>
      </PageHeader>

      <Section>
        <Card>
          <FeatureHeader>
            <FeatureTitle
              clickable
              onClick={() => setCreateFormOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setCreateFormOpen((prev) => !prev);
                }
              }}
            >
              <CollapseButton
                type="button"
                onClick={() => setCreateFormOpen((prev) => !prev)}
                aria-label={
                  createFormOpen
                    ? "Collapse create feature"
                    : "Expand create feature"
                }
              >
                {createFormOpen ? "▾" : "▸"}
              </CollapseButton>{" "}
              Create a new feature
            </FeatureTitle>
          </FeatureHeader>
          {createFormOpen && (
            <Form onSubmit={handleCreateFeature}>
              <FormGrid>
                <Field>
                  <Label htmlFor="feature-name">Name</Label>
                  <Input
                    id="feature-name"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    disabled={creatingFeature}
                    required
                  />
                </Field>
                <Field>
                  <Label htmlFor="feature-description">Description</Label>
                  <TextArea
                    id="feature-description"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    disabled={creatingFeature}
                  />
                </Field>
              </FormGrid>
              <ButtonRow>
                <Button type="submit" disabled={creatingFeature}>
                  {creatingFeature ? "Creating..." : "Create"}
                </Button>
              </ButtonRow>
            </Form>
          )}
        </Card>
      </Section>

      <Section>
        <FeatureHeader>
          <SearchInput
            id="feature-search"
            placeholder="Search features"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <SmallText>
            {searchQuery.trim()
              ? `Listing ${filteredFeatures.length} of ${sortedFeatures.length} features`
              : `Listing ${sortedFeatures.length} features`}
          </SmallText>
        </FeatureHeader>

        {error && <ErrorText>{error}</ErrorText>}
        {loading ? (
          <EmptyState>Loading features...</EmptyState>
        ) : filteredFeatures.length === 0 ? (
          <EmptyState>
            {searchQuery.trim()
              ? "No features match your search."
              : "No features were created yet."}
          </EmptyState>
        ) : (
          <FeatureList>
            {filteredFeatures.map((feature) => {
              const featureId = feature.id ?? "";
              const edits = featureId ? featureEdits[featureId] : undefined;
              const revisions = feature.revisions ?? [];
              const sortedRevisions = [...revisions].sort((a, b) => {
                const timeA = a.created_at
                  ? new Date(a.created_at).getTime()
                  : 0;
                const timeB = b.created_at
                  ? new Date(b.created_at).getTime()
                  : 0;
                return timeB - timeA;
              });
              const latestRevision = sortedRevisions[0];
              const isExpanded = featureId
                ? expandedFeatures[featureId]
                : false;
              const isSaving = busyFeatureId === featureId;
              const isEditing = featureId ? editingFeatures[featureId] : false;
              const isDirty =
                edits &&
                (edits.name !== (feature.name || "") ||
                  edits.description !== (feature.description || ""));

              return (
                <Card key={featureId || feature.name}>
                  <Form
                    onSubmit={(event) => handleUpdateFeature(feature, event)}
                  >
                    <FeatureHeader>
                      <FeatureMeta>
                        {isEditing ? (
                          <>
                            <Field>
                              <Label>Name</Label>
                              <Input
                                value={edits?.name || ""}
                                onChange={(event) =>
                                  featureId &&
                                  setFeatureEdits((prev) => ({
                                    ...prev,
                                    [featureId]: {
                                      name: event.target.value,
                                      description:
                                        prev[featureId]?.description ?? "",
                                    },
                                  }))
                                }
                                disabled={isSaving}
                                required
                              />
                            </Field>
                            <Field>
                              <Label>Description</Label>
                              <TextArea
                                value={edits?.description || ""}
                                onChange={(event) =>
                                  featureId &&
                                  setFeatureEdits((prev) => ({
                                    ...prev,
                                    [featureId]: {
                                      name: prev[featureId]?.name ?? "",
                                      description: event.target.value,
                                    },
                                  }))
                                }
                                disabled={isSaving}
                              />
                            </Field>
                          </>
                        ) : (
                          <>
                            <FeatureTitle>
                              {feature.name || "Untitled"}
                            </FeatureTitle>
                            <FeatureDescription>
                              {feature.description || "No description."}
                            </FeatureDescription>
                          </>
                        )}
                      </FeatureMeta>
                      <FeatureActions>
                        {feature.is_root && <Tag>Root</Tag>}
                        {feature.is_default && <Tag>Default</Tag>}
                        {isEditing ? (
                          <>
                            <Button
                              type="submit"
                              disabled={isSaving || !isDirty}
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => handleCancelEdit(feature)}
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() =>
                              featureId &&
                              setEditingFeatures((prev) => ({
                                ...prev,
                                [featureId]: true,
                              }))
                            }
                          >
                            Edit
                          </Button>
                        )}
                        {!isEditing && (
                          <Button
                            variant="danger"
                            type="button"
                            onClick={() => handleDeleteFeature(feature)}
                            disabled={isSaving}
                          >
                            Delete
                          </Button>
                        )}
                      </FeatureActions>
                    </FeatureHeader>
                  </Form>
                  <SmallText>
                    Last updated: {formatDate(feature.updated_at)}
                  </SmallText>
                  <RevisionHeader
                    type="button"
                    onClick={() => toggleExpanded(featureId)}
                    aria-label={
                      isExpanded ? "Collapse revisions" : "Expand revisions"
                    }
                  >
                    <IconButton aria-hidden>
                      {isExpanded ? "▾" : "▸"}
                    </IconButton>
                    <RevisionLabel>
                      Revisions ({revisions.length})
                    </RevisionLabel>
                  </RevisionHeader>

                  {isExpanded && (
                    <RevisionList>
                      {sortedRevisions.length === 0 ? (
                        <EmptyState>No revisions available yet.</EmptyState>
                      ) : (
                        sortedRevisions.map((revision, index) => (
                          <RevisionCard
                            key={revision.id ?? revision.created_at}
                          >
                            <div>
                              <InlineValue>ID:</InlineValue>{" "}
                              {revision.id || "—"}
                            </div>
                            {index === 0 && <LatestTag>Latest</LatestTag>}
                            <div>
                              <InlineValue>Strategy:</InlineValue>{" "}
                              {revision.execution_strategy || "—"}
                            </div>
                            {revision.execution_strategy === "prompt" && (
                              <div>
                                <InlineValue>Prompt:</InlineValue>{" "}
                                {getRevisionPreview(revision.prompt)}
                              </div>
                            )}
                            {revision.execution_strategy === "regex" && (
                              <div>
                                <InlineValue>Regex:</InlineValue>{" "}
                                {getRevisionPreview(revision.regex)}
                              </div>
                            )}
                            <div>
                              <InlineValue>Note:</InlineValue>{" "}
                              {revision.note || "—"}
                            </div>
                            <SmallText>
                              Created: {formatDate(revision.created_at)}
                            </SmallText>
                          </RevisionCard>
                        ))
                      )}

                      <Card>
                        <FeatureHeader>
                          <FeatureTitle
                            clickable
                            onClick={() =>
                              handleToggleCreateRevision(
                                featureId,
                                latestRevision,
                              )
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleToggleCreateRevision(
                                  featureId,
                                  latestRevision,
                                );
                              }
                            }}
                          >
                            <CollapseButton
                              type="button"
                              onClick={() =>
                                handleToggleCreateRevision(
                                  featureId,
                                  latestRevision,
                                )
                              }
                              aria-label={
                                createRevisionOpen[featureId]
                                  ? "Collapse create revision"
                                  : "Expand create revision"
                              }
                            >
                              {createRevisionOpen[featureId] ? "▾" : "▸"}
                            </CollapseButton>{" "}
                            Create a new revision
                          </FeatureTitle>
                        </FeatureHeader>
                        {createRevisionOpen[featureId] && (
                          <Form
                            onSubmit={(event) =>
                              handleCreateRevision(feature, event)
                            }
                          >
                            <FormGrid>
                              <Field>
                                <Label>Execution strategy</Label>
                                <Select
                                  value={
                                    revisionForms[featureId]
                                      ?.execution_strategy ?? "prompt"
                                  }
                                  onChange={(event) =>
                                    featureId &&
                                    setRevisionForms((prev) => ({
                                      ...prev,
                                      [featureId]: {
                                        ...prev[featureId],
                                        execution_strategy: event.target
                                          .value as RevisionFormState["execution_strategy"],
                                      },
                                    }))
                                  }
                                  disabled={isSaving}
                                >
                                  <option value="prompt">Prompt</option>
                                  <option value="regex">Regex</option>
                                </Select>
                              </Field>
                              {revisionForms[featureId]?.execution_strategy ===
                                "prompt" && (
                                <Field>
                                  <Label>Prompt</Label>
                                  <TextArea
                                    value={
                                      revisionForms[featureId]?.prompt ?? ""
                                    }
                                    onChange={(event) =>
                                      featureId &&
                                      setRevisionForms((prev) => ({
                                        ...prev,
                                        [featureId]: {
                                          ...prev[featureId],
                                          prompt: event.target.value,
                                        },
                                      }))
                                    }
                                    required
                                  />
                                </Field>
                              )}
                              {revisionForms[featureId]?.execution_strategy ===
                                "regex" && (
                                <Field>
                                  <Label>Regex</Label>
                                  <TextArea
                                    value={
                                      revisionForms[featureId]?.regex ?? ""
                                    }
                                    onChange={(event) =>
                                      featureId &&
                                      setRevisionForms((prev) => ({
                                        ...prev,
                                        [featureId]: {
                                          ...prev[featureId],
                                          regex: event.target.value,
                                        },
                                      }))
                                    }
                                    required
                                  />
                                </Field>
                              )}
                              <Field>
                                <Label>Note</Label>
                                <TextArea
                                  value={revisionForms[featureId]?.note ?? ""}
                                  onChange={(event) =>
                                    featureId &&
                                    setRevisionForms((prev) => ({
                                      ...prev,
                                      [featureId]: {
                                        ...prev[featureId],
                                        note: event.target.value,
                                      },
                                    }))
                                  }
                                  disabled={isSaving}
                                />
                              </Field>
                            </FormGrid>
                            <ButtonRow>
                              <Button
                                type="submit"
                                disabled={
                                  isSaving ||
                                  creatingRevisionFeatureId === featureId
                                }
                              >
                                {creatingRevisionFeatureId === featureId
                                  ? "Creating..."
                                  : "Create"}
                              </Button>
                            </ButtonRow>
                          </Form>
                        )}
                      </Card>
                    </RevisionList>
                  )}
                </Card>
              );
            })}
          </FeatureList>
        )}
      </Section>
    </PageContainer>
  );
}
