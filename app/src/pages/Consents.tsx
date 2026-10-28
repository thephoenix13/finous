import { useTranslation } from "react-i18next";
import { useApiData, type Api, type RequestOptions } from "../api";
import { LoadError, LoadingCard } from "../components/DataState";
import PageHeader from "../components/PageHeader";
import { Card, Row, RowGroup, Tag, type TagTone } from "../components/ui";
import { formatDayMonth } from "../lib/format";

const loadConsents = (api: Api, options: RequestOptions) => api.listConsents(options);

const TONE: Record<string, TagTone> = { active: "positive", expired: "warning", revoked: "negative" };

/** What Finous may read, for how long, and what happens to the data if a consent ends. */
export default function Consents() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const result = useApiData(loadConsents);

  return (
    <>
      <PageHeader title={t("you.consents.title")} backTo="/you" />
      {result.status === "loading" && <LoadingCard />}
      {result.status === "error" && <LoadError onRetry={result.retry} />}
      {result.status === "ready" &&
        (() => {
          const consents = result.data;
          const active = consents.filter((c) => c.status === "active");
          const hours = Math.min(...active.map((c) => c.refreshEveryHours));
          return (
            <div className="pb-8">
              <p className="px-5 pb-2 pt-3 text-[15px] text-ink-2">
                {active.length === 0 ? t("you.consents.noneActive") : t("you.consents.intro", { count: active.length, hours })}
              </p>
              <RowGroup>
                {consents.map((c) => (
                  <Row
                    key={c.id}
                    title={t(`you.consents.purpose.${c.purpose}`)}
                    subtitle={
                      <>
                        <span className="block">{t(`you.consents.scope.${c.scope}`)}</span>
                        <span className="mt-1 block text-[12px]">
                          {t("you.consents.expires", { date: `${formatDayMonth(c.expiresOn, lang)} ${c.expiresOn.slice(0, 4)}`, months: c.durationMonths })}
                        </span>
                      </>
                    }
                    right={<Tag tone={TONE[c.status]}>{t(`you.status.${c.status}`)}</Tag>}
                  />
                ))}
              </RowGroup>
              <section aria-labelledby="revoking" className="px-4 pt-8">
                <Card variant="outline">
                  <h2 id="revoking" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {t("you.consents.revokingTitle")}
                  </h2>
                  <p className="mt-2 text-[15px] text-ink">{t("you.consents.revokingBody")}</p>
                </Card>
              </section>
            </div>
          );
        })()}
    </>
  );
}
