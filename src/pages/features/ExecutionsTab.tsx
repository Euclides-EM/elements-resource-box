import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExecutionsService,
  featureplat_Feature,
  featureplat_FeatureExecution,
  featureplat_FeatureExecutionApplyItem,
  featureplat_FeatureExecutionSkipIf,
} from "../../../common/hub-api";
import { COLLECTION_ID } from "../../utils/hubApi";
import { loadEditionsData } from "../../utils/dataUtils";
import { Item } from "../../types";
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
} from "./styles";

interface ExecutionsTabProps {
  features: featureplat_Feature[];
  sortedFeatures: featureplat_Feature[];
  loading: boolean;
}

export function ExecutionsTab({
  features,
  sortedFeatures,
  loading,
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
    featureplat_FeatureExecutionSkipIf | ""
  >("");
  const [submittingExecution, setSubmittingExecution] = useState(false);

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

  const loadExecutions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadExecutions();
    if (editionItems.length === 0 && !editionItemsLoading) {
      setEditionItemsLoading(true);
      loadEditionsData(setEditionItems);
    }
  }, []);

  useEffect(() => {
    if (editionItems.length > 0) {
      setEditionItemsLoading(false);
    }
  }, [editionItems]);

  const handleCancelExecution = async (executionId: string) => {
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

  const handleSubmitExecution = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
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
    const apply: featureplat_FeatureExecutionApplyItem[] = [];
    for (const fId of selectedFeatureIds) {
      const feature = features.find((f) => f.id === fId);
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
    const execution: featureplat_FeatureExecution = {
      collection: COLLECTION_ID,
      apply,
      keys: Array.from(selectedKeys),
      policy: execSkipIf
        ? { skip_if: execSkipIf as featureplat_FeatureExecutionSkipIf }
        : undefined,
    };
    try {
      await ExecutionsService.postExecutions({ execution });
      setSelectedFeatureIds(new Set());
      setSelectedKeys(new Set());
      setExecSkipIf("");
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
                              <SmallText style={{ marginLeft: "auto" }}>
                                no revisions
                              </SmallText>
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
                        <ItemRow key={item.key}>
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
                <Select
                  value={execSkipIf}
                  onChange={(event) =>
                    setExecSkipIf(
                      event.target.value as
                        | featureplat_FeatureExecutionSkipIf
                        | "",
                    )
                  }
                >
                  <option value="">None</option>
                  <option value="feature_exist">Feature exist</option>
                  <option value="revision_exist">Revision exist</option>
                  <option value="human_reviewed">Human reviewed</option>
                </Select>
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
        <FeatureTitle>Past Executions</FeatureTitle>
        {executionsError && !execFormOpen && (
          <ErrorText>{executionsError}</ErrorText>
        )}
        {executionsLoading ? (
          <EmptyState>Loading executions...</EmptyState>
        ) : executions.length === 0 ? (
          <EmptyState>No executions found yet.</EmptyState>
        ) : (
          <FeatureList>
            {executions.map((execution) => {
              const execId = execution.id ?? "";
              const isCanceling = cancelingExecutionId === execId;
              const canCancel =
                execution.status === "in_progress" ||
                execution.status === "canceling";
              return (
                <Card key={execId || execution.created_at}>
                  <FeatureHeader>
                    <FeatureTitle>
                      {execution.name || execId || "Unnamed"}
                    </FeatureTitle>
                    <FeatureActions>
                      <StatusTag status={execution.status}>
                        {execution.status || "unknown"}
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
                  {execution.apply && execution.apply.length > 0 && (
                    <SmallText>
                      Features:{" "}
                      {execution.apply.map((a) => a.feature).join(", ")}
                    </SmallText>
                  )}
                  {execution.keys && execution.keys.length > 0 && (
                    <SmallText>
                      Keys: {execution.keys.length} item
                      {execution.keys.length !== 1 ? "s" : ""}
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
