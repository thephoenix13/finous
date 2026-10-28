import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Row, RowGroup } from "../components/ui";

const loadProfile = (api: Api, options: RequestOptions) => api.getProfile(options);

/** The details Finous holds about the user. Read-only until the Api can change them. */
export default function Profile() {
  const { t } = useTranslation();
  const result = useApiData(loadProfile);

  return (
    <>
      <PageHeader title={t("you.profile.title")} backTo="/you" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" && (
        <RowGroup className="mt-3">
          <Row title={t("you.profile.name")} subtitle={result.data.name} />
          <Row title={t("you.profile.email")} subtitle={result.data.email} />
          <Row title={t("you.profile.city")} subtitle={result.data.city} />
        </RowGroup>
      )}
    </>
  );
}
