import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMemberData } from "../../api/memberContext";
import { todayInIndia } from "../../api/memberSource";
import { useAuth } from "../../auth/AuthProvider";
import PageHeader from "../../components/PageHeader";
import { Button } from "../../components/ui";
import { downloadJson } from "../../lib/download";

type Step = "idle" | "working" | "done" | "failed";

/** What Finous holds about the member: take a copy of all of it, or have all of it deleted. Both are theirs to do whenever they like. */
export default function YourData() {
  const { t } = useTranslation();
  const data = useMemberData()!;
  const auth = useAuth();
  const [download, setDownload] = useState<Step>("idle");
  const [confirming, setConfirming] = useState(false);
  const [removal, setRemoval] = useState<Step>("idle");

  const takeCopy = async () => {
    setDownload("working");
    try {
      downloadJson(`finous-data-${todayInIndia()}.json`, await data.exportMyData());
      setDownload("done");
    } catch {
      setDownload("failed");
    }
  };

  const deleteEverything = async () => {
    setRemoval("working");
    try {
      await data.deleteMyAccount();
    } catch {
      setRemoval("failed");
      return;
    }
    // The account is gone: signing out takes them to the sign-in page, and nothing of theirs stays on this device.
    await auth.signOut();
  };

  return (
    <>
      <PageHeader title={t("you.data.title")} backTo="/you" />
      <div className="space-y-10 px-5 pb-10 pt-4">
        <section aria-labelledby="data-copy">
          <h2 id="data-copy" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("you.data.copy.title")}
          </h2>
          <p className="mt-3 max-w-[36ch] text-[15px] text-ink-2">{t("you.data.copy.body")}</p>
          <Button className="mt-5" variant="ghost" loading={download === "working"} onClick={() => void takeCopy()}>
            {t("you.data.copy.button")}
          </Button>
          {download === "done" && (
            <p role="status" className="mt-3 text-[13px] text-positive">
              {t("you.data.copy.done")}
            </p>
          )}
          {download === "failed" && (
            <p role="alert" className="mt-3 text-[13px] text-negative">
              {t("you.data.copy.failed")}
            </p>
          )}
        </section>

        <section aria-labelledby="data-delete">
          <h2 id="data-delete" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("you.data.delete.title")}
          </h2>
          <p className="mt-3 max-w-[36ch] text-[15px] text-ink-2">{t("you.data.delete.body")}</p>
          {confirming ? (
            <div role="group" aria-label={t("you.data.delete.title")} className="mt-5 space-y-3 rounded-btn bg-tint p-4">
              <p className="text-[15px] text-ink">{t("you.data.delete.sure")}</p>
              <Button variant="quiet" loading={removal === "working"} onClick={() => void deleteEverything()}>
                {t("you.data.delete.yes")}
              </Button>
              <Button variant="ghost" disabled={removal === "working"} onClick={() => setConfirming(false)}>
                {t("you.data.delete.no")}
              </Button>
            </div>
          ) : (
            <Button className="mt-5" variant="quiet" onClick={() => setConfirming(true)}>
              {t("you.data.delete.button")}
            </Button>
          )}
          {removal === "failed" && (
            <p role="alert" className="mt-3 text-[13px] text-negative">
              {t("you.data.delete.failed")}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
