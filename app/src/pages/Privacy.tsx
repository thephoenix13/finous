import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Row, RowGroup } from "../components/ui";

const loadConsents = (api: Api, options: RequestOptions) => api.listConsents(options);

/** In plain words: where the data comes from, how often it is refreshed, and what is deleted when. */
export default function Privacy() {
  const { t } = useTranslation();
  const result = useApiData(loadConsents);

  return (
    <>
      <PageHeader title={t("you.privacy.title")} backTo="/you" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (() => {
          const hours = Math.min(...result.data.filter((c) => c.status === "active").map((c) => c.refreshEveryHours));
          return (
            <RowGroup className="mt-3">
              <Row title={t("you.privacy.source.title")} subtitle={t("you.privacy.source.body")} />
              {Number.isFinite(hours) && <Row title={t("you.privacy.refresh.title")} subtitle={t("you.privacy.refresh.body", { hours })} />}
              <Row title={t("you.privacy.revoke.title")} subtitle={t("you.privacy.revoke.body")} />
              <Row title={t("you.privacy.close.title")} subtitle={t("you.privacy.close.body")} />
            </RowGroup>
          );
        })()}
    </>
  );
}
