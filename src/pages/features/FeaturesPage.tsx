import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { FeaturesService, featureplat_Feature } from "../../../common/hub-api";
import { AuthContext } from "../../contexts/Auth";
import { COLLECTION_ID, configureHubApi } from "../../utils/hubApi";
import { ActiveTab } from "./types";
import { DefinitionsTab } from "./DefinitionsTab";
import { ExecutionsTab } from "./ExecutionsTab";
import { PageContainer, PageHeader, Title, TabBar, TabButton } from "./styles";

export function FeaturesPage() {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useLocalStorage<ActiveTab>(
    "features-active-tab",
    "definitions",
  );
  const [apiReady, setApiReady] = useState(false);
  const [features, setFeatures] = useState<featureplat_Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedFeatures = useMemo(
    () =>
      [...features].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      ),
    [features],
  );

  const loadFeatures = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await FeaturesService.getCollectionsFeatures({
        collectionId: COLLECTION_ID,
        expand: ["revisions"],
      });
      setFeatures(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load features.");
    } finally {
      setLoading(false);
    }
  }, [apiReady]);

  useEffect(() => {
    configureHubApi(token);
    setApiReady(true);
  }, [token]);

  useEffect(() => {
    if (!apiReady) {
      return;
    }
    void loadFeatures();
  }, [apiReady, loadFeatures]);

  return (
    <PageContainer>
      <PageHeader>
        <Title>Title Page Features</Title>
      </PageHeader>

      <TabBar>
        <TabButton
          active={activeTab === "definitions"}
          onClick={() => setActiveTab("definitions")}
        >
          Definitions
        </TabButton>
        <TabButton
          active={activeTab === "executions"}
          onClick={() => setActiveTab("executions")}
        >
          Executions
        </TabButton>
      </TabBar>

      {activeTab === "definitions" && (
        <DefinitionsTab
          sortedFeatures={sortedFeatures}
          loading={loading}
          error={error}
          loadFeatures={loadFeatures}
          apiReady={apiReady}
        />
      )}
      {activeTab === "executions" && (
        <ExecutionsTab
          sortedFeatures={sortedFeatures}
          loading={loading}
          apiReady={apiReady}
        />
      )}
    </PageContainer>
  );
}
