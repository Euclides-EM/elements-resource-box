import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FeaturesService,
  FeatureRevisionsService,
  featureplat_Feature,
  featureplat_FeatureRevision,
} from "../../../common/hub-api";
import { COLLECTION_ID } from "../../utils/hubApi";
import {
  FeatureEditState,
  RevisionFormState,
  defaultRevisionForm,
} from "./types";
import { getRevisionDefaults, formatDate } from "./helpers";
import { HexColorPicker } from "react-colorful";
import {
  Section,
  Card,
  FeatureHeader,
  FeatureTitleRow,
  FeatureTitle,
  CollapseButton,
  Form,
  FormGrid,
  CreateFeatureGrid,
  CreateFeatureMainColumn,
  Field,
  Label,
  Input,
  TextArea,
  Select,
  ButtonRow,
  Button,
  SearchRow,
  SearchInput,
  SmallText,
  ErrorText,
  EmptyState,
  FeatureList,
  FeatureActions,
  Tag,
  FeatureDescription,
  FeatureMeta,
  RevisionHeader,
  IconButton,
  RevisionLabel,
  RevisionList,
  RevisionCard,
  InlineValue,
  LatestTag,
  ColorSwatch,
  ColorPickerRow,
  ColorPickerPanel,
  ColorHexInput,
} from "./styles";

const createRandomPastelColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.random() * 20;
  const lightness = 78 + Math.random() * 10;
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
};

const normalizeHexInput = (value: string) => {
  const cleaned = value.trim().replace(/^#/, "");
  if (!cleaned) {
    return "";
  }
  return `#${cleaned.toLowerCase()}`;
};

interface DefinitionsTabProps {
  features: featureplat_Feature[];
  sortedFeatures: featureplat_Feature[];
  loading: boolean;
  error: string | null;
  loadFeatures: () => Promise<void>;
  apiReady: boolean;
}

export function DefinitionsTab({
  features,
  sortedFeatures,
  loading,
  error: parentError,
  loadFeatures,
  apiReady,
}: DefinitionsTabProps) {
  const [featureEdits, setFeatureEdits] = useState<
    Record<string, FeatureEditState>
  >({});
  const [createForm, setCreateForm] = useState<FeatureEditState>(() => ({
    name: "",
    description: "",
    color: createRandomPastelColor(),
  }));
  const [revisionForms, setRevisionForms] = useState<
    Record<string, RevisionFormState>
  >({});
  const [expandedFeatures, setExpandedFeatures] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busyFeatureId, setBusyFeatureId] = useState<string | null>(null);
  const [creatingFeature, setCreatingFeature] = useState(false);
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

  const reloadFeatures = useCallback(async () => {
    await loadFeatures();
  }, [loadFeatures]);

  const syncAndReload = useCallback(async () => {
    await reloadFeatures();
  }, [reloadFeatures]);

  useEffect(() => {
    const nextEdits: Record<string, FeatureEditState> = {};
    const nextRevisionForms: Record<string, RevisionFormState> = {};
    features.forEach((feature) => {
      if (!feature.id) return;
      nextEdits[feature.id] = {
        name: feature.name || "",
        description: feature.description || "",
        color: feature.color || "",
      };
      nextRevisionForms[feature.id] = { ...defaultRevisionForm };
    });
    setFeatureEdits(nextEdits);
    setRevisionForms(nextRevisionForms);
  }, [features]);

  const handleUpdateFeature = async (
    feature: featureplat_Feature,
    event?: React.FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!apiReady) {
      return;
    }
    if (!feature.id) {
      return;
    }
    const form = featureEdits[feature.id];
    if (!form?.name?.trim()) {
      setError("Feature name is required.");
      return;
    }
    setBusyFeatureId(feature.id);
    setError(null);
    try {
      await FeaturesService.putCollectionsFeatures({
        collectionId: COLLECTION_ID,
        featureId: feature.id,
        feature: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color.trim() || undefined,
          is_root: feature.is_root ?? false,
          is_default: feature.is_default ?? false,
        },
      });
      setEditingFeatures((prev) => ({
        ...prev,
        [feature.id as string]: false,
      }));
      await syncAndReload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update feature.",
      );
    } finally {
      setBusyFeatureId(null);
    }
  };

  const handleDeleteFeature = async (feature: featureplat_Feature) => {
    if (!apiReady) {
      return;
    }
    if (!feature.id) {
      return;
    }
    if (!window.confirm(`Delete "${feature.name || "this feature"}"?`)) {
      return;
    }
    setBusyFeatureId(feature.id);
    setError(null);
    try {
      await FeaturesService.deleteCollectionsFeatures({
        collectionId: COLLECTION_ID,
        featureId: feature.id,
      });
      await syncAndReload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete feature.",
      );
    } finally {
      setBusyFeatureId(null);
    }
  };

  const handleCancelEdit = (feature: featureplat_Feature) => {
    if (!feature.id) {
      return;
    }
    setFeatureEdits((prev) => ({
      ...prev,
      [feature.id as string]: {
        name: feature.name || "",
        description: feature.description || "",
        color: feature.color || "",
      },
    }));
    setEditingFeatures((prev) => ({
      ...prev,
      [feature.id as string]: false,
    }));
  };

  const handleToggleCreateRevision = (
    featureId: string,
    latestRevision?: featureplat_FeatureRevision,
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
    if (!apiReady) {
      return;
    }
    if (!createForm.name.trim()) {
      setError("Feature name is required.");
      return;
    }
    setCreatingFeature(true);
    setError(null);
    try {
      await FeaturesService.postCollectionsFeatures({
        collectionId: COLLECTION_ID,
        feature: {
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          color: createForm.color.trim() || undefined,
          is_root: false,
          is_default: false,
        },
      });
      setCreateForm({
        name: "",
        description: "",
        color: createRandomPastelColor(),
      });
      await syncAndReload();
      setCreateFormOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create feature.",
      );
    } finally {
      setCreatingFeature(false);
    }
  };

  const handleCreateRevision = async (
    feature: featureplat_Feature,
    event?: React.FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();
    if (!apiReady) {
      return;
    }
    if (!feature.id) {
      return;
    }
    const form = revisionForms[feature.id] ?? defaultRevisionForm;
    if (form.execution_strategy === "prompt" && !form.prompt.trim()) {
      setError("Prompt text is required for prompt-based revisions.");
      return;
    }
    if (form.execution_strategy === "regex" && !form.regex.trim()) {
      setError("Regex text is required for regex-based revisions.");
      return;
    }
    setCreatingRevisionFeatureId(feature.id);
    setError(null);
    const payload: featureplat_FeatureRevision = {
      execution_strategy: form.execution_strategy,
      type: form.type,
      note: form.note.trim() || undefined,
      prompt:
        form.execution_strategy === "prompt" ? form.prompt.trim() : undefined,
      regex:
        form.execution_strategy === "regex" ? form.regex.trim() : undefined,
    };
    try {
      await FeatureRevisionsService.postCollectionsFeaturesRevisions({
        collectionId: COLLECTION_ID,
        featureId: feature.id,
        revision: payload,
      });
      setRevisionForms((prev) => ({
        ...prev,
        [feature.id as string]: { ...defaultRevisionForm },
      }));
      await syncAndReload();
    } catch (err) {
      setError(
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

  const displayError = error || parentError;

  return (
    <>
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
              <CreateFeatureGrid>
                <CreateFeatureMainColumn>
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
                </CreateFeatureMainColumn>
                <Field>
                  <Label>Color</Label>
                  <ColorPickerRow>
                    <ColorSwatch color={createForm.color} />
                    <ColorPickerPanel>
                      <HexColorPicker
                        color={createForm.color || "#f2f2f2"}
                        onChange={(value) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            color: value,
                          }))
                        }
                      />
                    </ColorPickerPanel>
                    <ColorHexInput
                      value={createForm.color.replace(/^#/, "")}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          color: normalizeHexInput(event.target.value),
                        }))
                      }
                      disabled={creatingFeature}
                      aria-label="New feature color value"
                    />
                  </ColorPickerRow>
                </Field>
              </CreateFeatureGrid>
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
        <SearchRow>
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
        </SearchRow>

        {displayError && <ErrorText>{displayError}</ErrorText>}
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
                  edits.description !== (feature.description || "") ||
                  edits.color !== (feature.color || ""));

              return (
                <Card key={featureId || feature.name}>
                  <Form
                    onSubmit={(event) => handleUpdateFeature(feature, event)}
                  >
                    <FeatureHeader>
                      <FeatureTitleRow>
                        <ColorSwatch color={feature.color} />
                        <FeatureTitle>
                          {feature.name || "Untitled"}
                        </FeatureTitle>
                      </FeatureTitleRow>
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
                    {isEditing ? (
                      <FeatureMeta>
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
                                  color: prev[featureId]?.color ?? "",
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
                                  color: prev[featureId]?.color ?? "",
                                },
                              }))
                            }
                            disabled={isSaving}
                          />
                        </Field>
                        <Field>
                          <Label>Color</Label>
                          <ColorPickerRow>
                            <ColorSwatch
                              color={edits?.color || feature.color}
                            />
                            <ColorPickerPanel>
                              <HexColorPicker
                                color={edits?.color || "#f2f2f2"}
                                onChange={(value) =>
                                  featureId &&
                                  setFeatureEdits((prev) => ({
                                    ...prev,
                                    [featureId]: {
                                      name: prev[featureId]?.name ?? "",
                                      description:
                                        prev[featureId]?.description ?? "",
                                      color: value,
                                    },
                                  }))
                                }
                              />
                            </ColorPickerPanel>
                            <ColorHexInput
                              value={(edits?.color || "").replace(/^#/, "")}
                              onChange={(event) =>
                                featureId &&
                                setFeatureEdits((prev) => ({
                                  ...prev,
                                  [featureId]: {
                                    name: prev[featureId]?.name ?? "",
                                    description:
                                      prev[featureId]?.description ?? "",
                                    color: normalizeHexInput(
                                      event.target.value,
                                    ),
                                  },
                                }))
                              }
                              disabled={isSaving}
                              aria-label="Feature color value"
                            />
                          </ColorPickerRow>
                        </Field>
                      </FeatureMeta>
                    ) : (
                      <FeatureDescription>
                        {feature.description || "No description."}
                      </FeatureDescription>
                    )}
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
                              <InlineValue>Type:</InlineValue>{" "}
                              {revision.type || "—"}
                            </div>
                            <div>
                              <InlineValue>Strategy:</InlineValue>{" "}
                              {revision.execution_strategy || "—"}
                            </div>
                            {revision.execution_strategy === "prompt" && (
                              <div>
                                <InlineValue>Prompt:</InlineValue>
                                {"\n"}
                                {revision.prompt || "—"}
                              </div>
                            )}
                            {revision.execution_strategy === "regex" && (
                              <div>
                                <InlineValue>Regex:</InlineValue>
                                {"\n"}
                                {revision.regex || "—"}
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
                              <Field>
                                <Label>Type</Label>
                                <Select
                                  value={
                                    revisionForms[featureId]?.type ??
                                    "annotation"
                                  }
                                  onChange={(event) =>
                                    featureId &&
                                    setRevisionForms((prev) => ({
                                      ...prev,
                                      [featureId]: {
                                        ...prev[featureId],
                                        type: event.target
                                          .value as RevisionFormState["type"],
                                      },
                                    }))
                                  }
                                  disabled={isSaving}
                                >
                                  <option value="annotation">Annotation</option>
                                  <option value="ner">NER</option>
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
    </>
  );
}
