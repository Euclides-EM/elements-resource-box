import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExecutionsService,
  featureplat_Feature,
  featureplat_FeatureExecution,
  featureplat_FeatureExecutionApplyItem,
  featureplat_FeatureExecutionStatus,
  featureplat_FeatureExecutionSkipIf,
} from "../../../common/hub-api";
import { COLLECTION_ID } from "../../utils/hubApi";
import { loadEditionsData } from "../../utils/dataUtils";
import { Item } from "../../types";
import MultiSelect from "../../components/tps/filters/MultiSelect";
import { STUDY_CORPORA_FILTER } from "./types";
import { formatDate } from "./helpers";
import {
  Section,
  Card,
  FeatureHeader,
  FeatureTitle,
  CollapseButton,
  Form,
  Field,
  Label,
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
  FeatureDescription,
  StatusTag,
  CheckboxRow,
  CheckboxList,
  ItemRow,
  ItemDetails,
  InlineValue,
  FeatureTokenList,
  FeatureToken,
  FeatureTokenColor,
  NoRevisionText,
  ExecutionEditionsToggle,
  ExecutionEditionsToggleContent,
} from "./styles";
import pluralize from "pluralize";

interface ExecutionsTabProps {
  sortedFeatures: featureplat_Feature[];
  loading: boolean;
  apiReady: boolean;
}

const EXECUTION_STATUS_LABELS: Record<
  featureplat_FeatureExecutionStatus,
  string
> = {
  success: "Completed",
  failed: "Failed",
  in_progress: "In progress",
  canceling: "Canceling",
  canceled: "Canceled",
};

const EXECUTION_SKIP_IF_OPTIONS: featureplat_FeatureExecutionSkipIf[] = [
  "feature_exist",
  "revision_exist",
  "human_reviewed",
];

const EXECUTION_SKIP_IF_LABELS: Record<
  featureplat_FeatureExecutionSkipIf,
  string
> = {
  feature_exist: "Feature exist",
  revision_exist: "Revision exist",
  human_reviewed: "Human reviewed",
};

export function ExecutionsTab({
  sortedFeatures,
  loading,
  apiReady,
}: ExecutionsTabProps) {
  const [executions, setExecutions] = useState<featureplat_FeatureExecution[]>(
    [],
  );
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [executionsError, setExecutionsError] = useState<string | null>(null);
  const [cancelingExecutionId, setCancelingExecutionId] = useState<
    string | null
  >(null);

  const [execFormOpen, setExecFormOpen] = useState(false);
  const [editionSearch, setEditionSearch] = useState("");
  const [execFeatureSearch, setExecFeatureSearch] = useState("");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(
    new Set(),
  );
  const [editionItems, setEditionItems] = useState<Item[]>([]);
  const [editionItemsLoading, setEditionItemsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [execSkipIf, setExecSkipIf] = useState<
    featureplat_FeatureExecutionSkipIf[]
  >([]);
  const [submittingExecution, setSubmittingExecution] = useState(false);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<
    "all" | featureplat_FeatureExecutionStatus
  >("all");
  const [expandedExecutionEditions, setExpandedExecutionEditions] = useState<
    Record<string, boolean>
  >({});

  const corpusEditionItems = useMemo(
    () =>
      editionItems.filter((item) =>
        item.study_corpora.includes(STUDY_CORPORA_FILTER),
      ),
    [editionItems],
  );

  const execFilteredFeatures = useMemo(() => {
    const q = execFeatureSearch.trim().toLowerCase();
    if (!q) return sortedFeatures;
    return sortedFeatures.filter(
      (f) =>
        (f.name?.toLowerCase() ?? "").includes(q) ||
        (f.description?.toLowerCase() ?? "").includes(q),
    );
  }, [sortedFeatures, execFeatureSearch]);

  const featureInfoById = useMemo(() => {
    const map: Record<string, { name: string; color?: string }> = {};
    for (const feature of sortedFeatures) {
      if (!feature.id) {
        continue;
      }
      map[feature.id] = {
        name: feature.name || feature.id,
        color: feature.color || undefined,
      };
    }
    return map;
  }, [sortedFeatures]);

  const filteredExecutions = useMemo(() => {
    if (executionStatusFilter === "all") {
      return executions;
    }
    return executions.filter(
      (execution) => execution.status === executionStatusFilter,
    );
  }, [executions, executionStatusFilter]);

  const filteredEditionItems = useMemo(() => {
    const q = editionSearch.trim().toLowerCase();
    if (!q) return corpusEditionItems;
    return corpusEditionItems.filter((item) => {
      const hay = [
        item.year,
        item.authors.join(", "),
        item.cities.join(", "),
        item.shortTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [corpusEditionItems, editionSearch]);

  const editionItemByKey = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of editionItems) {
      map.set(item.key, item);
    }
    return map;
  }, [editionItems]);

  const loadExecutions = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    setExecutionsLoading(true);
    setExecutionsError(null);
    try {
      const response = await ExecutionsService.getExecutions({
        collection: COLLECTION_ID,
      });
      setExecutions(response ?? []);
    } catch (err) {
      setExecutionsError(
        err instanceof Error ? err.message : "Failed to load executions.",
      );
    } finally {
      setExecutionsLoading(false);
    }
  }, [apiReady]);

  useEffect(() => {
    if (!apiReady) {
      return;
    }
    void loadExecutions();
    if (editionItems.length === 0 && !editionItemsLoading) {
      setEditionItemsLoading(true);
      loadEditionsData(setEditionItems);
    }
  }, [apiReady, editionItems.length, editionItemsLoading, loadExecutions]);

  useEffect(() => {
    if (editionItems.length > 0) {
      setEditionItemsLoading(false);
    }
  }, [editionItems]);

  const handleCancelExecution = async (executionId: string) => {
    if (!apiReady) {
      return;
    }
    setCancelingExecutionId(executionId);
    try {
      await ExecutionsService.putExecutionsCancel({ executionId });
      await loadExecutions();
    } catch (err) {
      setExecutionsError(
        err instanceof Error ? err.message : "Failed to cancel execution.",
      );
    } finally {
      setCancelingExecutionId(null);
    }
  };

  const toggleFeatureSelection = (featureId: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const toggleKeySelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleExecutionEditions = (executionKey: string) => {
    setExpandedExecutionEditions((prev) => ({
      ...prev,
      [executionKey]: !prev[executionKey],
    }));
  };

  const handleSubmitExecution = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!apiReady) {
      return;
    }
    if (selectedFeatureIds.size === 0) {
      setExecutionsError("Select at least one feature.");
      return;
    }
    if (selectedKeys.size === 0) {
      setExecutionsError("Select at least one edition.");
      return;
    }
    setSubmittingExecution(true);
    setExecutionsError(null);
    const featureById = new Map(
      sortedFeatures
        .filter((feature): feature is featureplat_Feature & { id: string } =>
          Boolean(feature.id),
        )
        .map((feature) => [feature.id, feature]),
    );
    const apply: featureplat_FeatureExecutionApplyItem[] = [];
    for (const fId of selectedFeatureIds) {
      const feature = featureById.get(fId);
      if (!feature) continue;
      const revisions = [...(feature.revisions ?? [])].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      apply.push({
        collection: COLLECTION_ID,
        feature: fId,
        revision: revisions[0]?.id,
      });
    }
    const executionPayload: featureplat_FeatureExecution = {
      collection: COLLECTION_ID,
      apply,
      keys: Array.from(selectedKeys),
      policy: execSkipIf.length ? { skip_if: execSkipIf } : undefined,
    };
    try {
      await ExecutionsService.postExecutions({
        execution: executionPayload,
      });
      setSelectedFeatureIds(new Set());
      setSelectedKeys(new Set());
      setExecSkipIf([]);
      setExecFormOpen(false);
      await loadExecutions();
    } catch (err) {
      setExecutionsError(
        err instanceof Error ? err.message : "Failed to create execution.",
      );
    } finally {
      setSubmittingExecution(false);
    }
  };

  return (
    <>
      <Section>
        <Card>
          <FeatureHeader>
            <FeatureTitle
              clickable
              onClick={() => setExecFormOpen((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExecFormOpen((prev) => !prev);
                }
              }}
            >
              <CollapseButton
                type="button"
                onClick={() => setExecFormOpen((prev) => !prev)}
                aria-label={
                  execFormOpen
                    ? "Collapse new execution"
                    : "Expand new execution"
                }
              >
                {execFormOpen ? "▾" : "▸"}
              </CollapseButton>{" "}
              Execute
            </FeatureTitle>
          </FeatureHeader>
          {execFormOpen && (
            <Form onSubmit={handleSubmitExecution}>
              <Field>
                <Label>Features ({selectedFeatureIds.size} selected)</Label>
                {loading ? (
                  <EmptyState>Loading features...</EmptyState>
                ) : sortedFeatures.length === 0 ? (
                  <EmptyState>No features available.</EmptyState>
                ) : (
                  <>
                    <SearchRow>
                      <SearchInput
                        placeholder="Search features"
                        value={execFeatureSearch}
                        onChange={(event) =>
                          setExecFeatureSearch(event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSelectedFeatureIds(
                            new Set(
                              execFilteredFeatures
                                .map((f) => f.id!)
                                .filter(Boolean),
                            ),
                          )
                        }
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedFeatureIds(new Set())}
                      >
                        Deselect all
                      </Button>
                    </SearchRow>
                    <CheckboxList>
                      {execFilteredFeatures.map((feature) => {
                        const fId = feature.id ?? "";
                        if (!fId) return null;
                        const revisions = [...(feature.revisions ?? [])].sort(
                          (a, b) => {
                            const tA = a.created_at
                              ? new Date(a.created_at).getTime()
                              : 0;
                            const tB = b.created_at
                              ? new Date(b.created_at).getTime()
                              : 0;
                            return tB - tA;
                          },
                        );
                        const latestRev = revisions[0];
                        return (
                          <CheckboxRow key={fId}>
                            <input
                              type="checkbox"
                              checked={selectedFeatureIds.has(fId)}
                              onChange={() => toggleFeatureSelection(fId)}
                            />
                            <span>{feature.name || "Untitled"}</span>
                            {!latestRev && (
                              <NoRevisionText>no revisions</NoRevisionText>
                            )}
                          </CheckboxRow>
                        );
                      })}
                    </CheckboxList>
                  </>
                )}
              </Field>
              <Field>
                <Label>Editions ({selectedKeys.size} selected)</Label>
                {editionItemsLoading ? (
                  <EmptyState>Loading editions...</EmptyState>
                ) : corpusEditionItems.length === 0 ? (
                  <EmptyState>No matching edition items found.</EmptyState>
                ) : (
                  <>
                    <SearchRow>
                      <SearchInput
                        placeholder="Search editions"
                        value={editionSearch}
                        onChange={(event) =>
                          setEditionSearch(event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSelectedKeys(
                            new Set(filteredEditionItems.map((i) => i.key)),
                          )
                        }
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedKeys(new Set())}
                      >
                        Deselect all
                      </Button>
                    </SearchRow>
                    <CheckboxList>
                      {filteredEditionItems.map((item) => (
                        <ItemRow key={item.key} interactive>
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(item.key)}
                            onChange={() => toggleKeySelection(item.key)}
                          />
                          <ItemDetails>
                            <InlineValue>
                              {[
                                item.year,
                                item.authors.join(", "),
                                item.cities.join(", "),
                              ]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </InlineValue>
                            {(item.shortTitle || item.title) && (
                              <span>- {item.shortTitle || item.title}</span>
                            )}
                          </ItemDetails>
                        </ItemRow>
                      ))}
                    </CheckboxList>
                  </>
                )}
              </Field>
              <Field>
                <Label>Skip if (optional)</Label>
                <MultiSelect
                  name="Skip if"
                  options={EXECUTION_SKIP_IF_OPTIONS}
                  value={execSkipIf}
                  onChange={(values) =>
                    setExecSkipIf(
                      values as featureplat_FeatureExecutionSkipIf[],
                    )
                  }
                  labelFn={(value) =>
                    EXECUTION_SKIP_IF_LABELS[
                      value as featureplat_FeatureExecutionSkipIf
                    ] || value
                  }
                  placeholder="Select skip-if rules"
                />
              </Field>
              {executionsError && <ErrorText>{executionsError}</ErrorText>}
              <ButtonRow>
                <Button type="submit" disabled={submittingExecution}>
                  {submittingExecution ? "Submitting..." : "Submit Execution"}
                </Button>
              </ButtonRow>
            </Form>
          )}
        </Card>
      </Section>

      <Section>
        <FeatureHeader>
          <FeatureTitle>Executions</FeatureTitle>
          <FeatureActions>
            <Button
              type="button"
              variant="primary"
              onClick={() => void loadExecutions()}
              disabled={executionsLoading}
            >
              {executionsLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Select
              id="execution-status-filter"
              value={executionStatusFilter}
              aria-label="Filter executions by status"
              onChange={(event) =>
                setExecutionStatusFilter(
                  event.target.value as
                    | "all"
                    | featureplat_FeatureExecutionStatus,
                )
              }
            >
              <option value="all">All statuses</option>
              {(
                Object.keys(
                  EXECUTION_STATUS_LABELS,
                ) as Array<featureplat_FeatureExecutionStatus>
              ).map((status) => (
                <option key={status} value={status}>
                  {EXECUTION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FeatureActions>
        </FeatureHeader>
        {executionsError && !execFormOpen && (
          <ErrorText>{executionsError}</ErrorText>
        )}
        {executionsLoading ? (
          <EmptyState>Loading executions...</EmptyState>
        ) : filteredExecutions.length === 0 ? (
          <EmptyState>
            {executions.length === 0
              ? "No executions found yet."
              : "No executions match the selected status."}
          </EmptyState>
        ) : (
          <FeatureList>
            {filteredExecutions.map((execution, index) => {
              const execId = execution.id ?? "";
              const executionCardKey =
                execId || execution.created_at || String(index);
              const isCanceling = cancelingExecutionId === execId;
              const canCancel =
                execution.status === "in_progress" ||
                execution.status === "canceling";
              const executionKeys = execution.keys ?? [];
              const showExecutionEditions =
                expandedExecutionEditions[executionCardKey] ?? false;
              return (
                <Card key={executionCardKey}>
                  <FeatureHeader>
                    <FeatureTitle>
                      {execution.name || execId || "Unnamed"}
                    </FeatureTitle>
                    <FeatureActions>
                      <StatusTag status={execution.status}>
                        {execution.status
                          ? EXECUTION_STATUS_LABELS[execution.status] ||
                            execution.status
                          : "Unknown"}
                      </StatusTag>
                      {canCancel && (
                        <Button
                          variant="danger"
                          type="button"
                          onClick={() =>
                            execId && handleCancelExecution(execId)
                          }
                          disabled={isCanceling}
                        >
                          {isCanceling ? "Canceling..." : "Cancel"}
                        </Button>
                      )}
                    </FeatureActions>
                  </FeatureHeader>
                  {execution.description && (
                    <FeatureDescription>
                      {execution.description}
                    </FeatureDescription>
                  )}
                  <SmallText>
                    Created: {formatDate(execution.created_at)}
                  </SmallText>
                  {executionKeys.length > 0 && (
                    <>
                      <ExecutionEditionsToggle
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          toggleExecutionEditions(executionCardKey)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExecutionEditions(executionCardKey);
                          }
                        }}
                      >
                        <ExecutionEditionsToggleContent>
                          <CollapseButton
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExecutionEditions(executionCardKey);
                            }}
                            aria-label={
                              showExecutionEditions
                                ? "Collapse included editions"
                                : "Expand included editions"
                            }
                          >
                            {showExecutionEditions ? "▾" : "▸"}
                          </CollapseButton>
                          <span>
                            Including {executionKeys.length}{" "}
                            {pluralize("edition", executionKeys.length)}.
                          </span>
                        </ExecutionEditionsToggleContent>
                      </ExecutionEditionsToggle>
                      {showExecutionEditions && (
                        <CheckboxList>
                          {executionKeys.map((editionKey) => {
                            const item = editionItemByKey.get(editionKey);
                            if (!item) {
                              return (
                                <ItemRow key={editionKey} as="div">
                                  <ItemDetails>
                                    <InlineValue>{editionKey}</InlineValue>
                                    <span> - details unavailable</span>
                                  </ItemDetails>
                                </ItemRow>
                              );
                            }
                            return (
                              <ItemRow key={editionKey} as="div">
                                <ItemDetails>
                                  <InlineValue>
                                    {[
                                      item.year,
                                      item.authors.join(", "),
                                      item.cities.join(", "),
                                    ]
                                      .filter(Boolean)
                                      .join(", ") || "—"}
                                  </InlineValue>
                                  {(item.shortTitle || item.title) && (
                                    <span>
                                      {" "}
                                      - {item.shortTitle || item.title}
                                    </span>
                                  )}
                                </ItemDetails>
                              </ItemRow>
                            );
                          })}
                        </CheckboxList>
                      )}
                    </>
                  )}
                  {execution.apply && execution.apply.length > 0 && (
                    <SmallText>
                      Features:
                      <FeatureTokenList>
                        {execution.apply.map((applyItem, index) => {
                          const featureId = applyItem.feature ?? "";
                          const featureInfo = featureInfoById[featureId];
                          const label =
                            featureInfo?.name || featureId || "Unknown feature";
                          return (
                            <FeatureToken
                              key={`${featureId || "unknown"}-${index}`}
                              title={featureId}
                            >
                              <FeatureTokenColor color={featureInfo?.color} />
                              {label}
                            </FeatureToken>
                          );
                        })}
                      </FeatureTokenList>
                    </SmallText>
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
