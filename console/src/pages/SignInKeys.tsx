import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useApi } from "../api/context";
import type { ApiKeyInfo, NewKey, SignInSettings, SingleSignOn } from "../api/types";
import { useApiData } from "../api/useApiData";
import { formatDate } from "../lib/format";
import { useSaver } from "../lib/useSaver";
import { validateKeyName, validateSso } from "../lib/validate";
import { ROUTES } from "../routes";
import { Button, Card, Field, PageHeader, Switch } from "../ui";
import CopyButton from "../ui/CopyButton";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";
import { IntegrationTabs } from "./SettingsTabs";

const load = (api: ReturnType<typeof useApi>, options: { signal?: AbortSignal }) => api.signInSettings(options);

function Handoff({ url }: { url: string | null }) {
  return (
    <Card as="section">
      <h2 className="text-[18px] font-semibold">Link from your app</h2>
      <p className="mt-1 max-w-[64ch] text-ink-2">Your IT team puts this link in your own app, so customers open Finous from it. Signing them in automatically needs single sign-on, below.</p>
      {url ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="rounded-btn bg-tint px-3 py-2.5 text-[14px]">{url}</code>
          <CopyButton text={url} what="the link" />
        </div>
      ) : (
        <p className="mt-4 text-[14px]">
          You need a web address first.{" "}
          <Link to={ROUTES.address} className="font-medium text-brand-strong underline underline-offset-2">
            Choose your web address
          </Link>
        </p>
      )}
    </Card>
  );
}

function SsoForm({ initial }: { initial: SingleSignOn }) {
  const api = useApi();
  const [sso, setSso] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const saver = useSaver();
  const errors = validateSso(sso);
  const shown = (k: keyof typeof errors) => (attempted ? errors[k] : undefined);
  const set = (patch: Partial<SingleSignOn>) => {
    setSso((s) => ({ ...s, ...patch }));
    saver.reset();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    await saver.run(() => api.saveSingleSignOn({ enabled: sso.enabled, provider: sso.provider.trim(), entityId: sso.entityId.trim(), signInUrl: sso.signInUrl.trim() }));
  }

  return (
    <Card as="section">
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-[18px] font-semibold">Single sign-on</h2>
            <p className="mt-1 max-w-[64ch] text-ink-2">Lets customers who are signed in to your app open Finous without a second sign-up. No passwords or secrets are entered on this screen.</p>
          </div>
          <Switch label="Single sign-on" checked={sso.enabled} onCheckedChange={(enabled) => set({ enabled })} />
        </div>
        <div className="mt-5 grid max-w-[560px] gap-4">
          <Field label="Sign-in service" value={sso.provider} error={shown("provider")} onChange={(e) => set({ provider: e.target.value })} hint="For example Microsoft Entra or Okta." disabled={!sso.enabled} />
          <Field label="Identifier" value={sso.entityId} error={shown("entityId")} onChange={(e) => set({ entityId: e.target.value })} hint="Also called the entity ID or issuer." disabled={!sso.enabled} />
          <Field label="Sign-in address" type="url" value={sso.signInUrl} error={shown("signInUrl")} onChange={(e) => set({ signInUrl: e.target.value })} hint="Starts with https://." disabled={!sso.enabled} />
        </div>
        <SaveBar state={saver.state} label="Save single sign-on" />
      </form>
    </Card>
  );
}

function SecretBox({ made, onDone }: { made: NewKey; onDone: () => void }) {
  return (
    <div role="status" className="rounded-card border border-warning bg-warning/10 p-4">
      <p className="font-medium">
        {made.key.name}: copy this key now. You won't see it again.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="break-all rounded-btn bg-surface px-3 py-2.5 text-[14px]">{made.secret}</code>
        <CopyButton text={made.secret} what={`the key for ${made.key.name}`} />
        <Button variant="quiet" onClick={onDone}>
          I've stored it
        </Button>
      </div>
    </div>
  );
}

function Keys({ initial }: { initial: ApiKeyInfo[] }) {
  const api = useApi();
  const [keys, setKeys] = useState(initial);
  const [name, setName] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [made, setMade] = useState<NewKey | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameError = validateKeyName(name);

  async function create(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (nameError || busy) return;
    setBusy(true);
    setFailed(null);
    try {
      const result = await api.createKey(name.trim());
      setKeys((k) => [...k, result.key]);
      setMade(result);
      setName("");
      setAttempted(false);
    } catch {
      setFailed("We couldn't make the key. Nothing was created. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function rotate(id: string) {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    try {
      const result = await api.rotateKey(id);
      setKeys((k) => k.map((x) => (x.id === id ? result.key : x)));
      setMade(result);
      setConfirming(null);
    } catch {
      setFailed("We couldn't rotate the key. The old key still works. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <h2 className="text-[18px] font-semibold">API keys</h2>
      <p className="mt-1 max-w-[64ch] text-ink-2">Keys let your systems talk to Finous. A key is shown once, when it is made. After that only its first characters are kept on screen.</p>

      {made ? (
        <div className="mt-4">
          <SecretBox made={made} onDone={() => setMade(null)} />
        </div>
      ) : null}
      {failed ? (
        <p role="alert" className="mt-4 text-[14px] text-negative">
          {failed}
        </p>
      ) : null}

      {keys.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <caption className="sr-only">API keys</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Starts with</th>
                <th scope="col" className="px-4 py-3 font-semibold">Made</th>
                <th scope="col" className="px-4 py-3 font-semibold">Last used</th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3">
                    <code>{k.prefix}…</code>
                  </td>
                  <td className="px-4 py-3">{formatDate(k.createdAt)}</td>
                  <td className="px-4 py-3">{k.lastUsed ? formatDate(k.lastUsed) : "Never"}</td>
                  <td className="px-4 py-3">
                    {confirming === k.id ? (
                      <div className="space-y-2">
                        <p className="max-w-[28ch] text-[13px] text-ink-2">The old key stops working at once. Anything using it must be updated.</p>
                        <div className="flex gap-2">
                          <Button variant="danger" loading={busy} onClick={() => void rotate(k.id)}>
                            Rotate {k.name}
                          </Button>
                          <Button variant="quiet" onClick={() => setConfirming(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" onClick={() => setConfirming(k.id)}>
                        Rotate <span className="sr-only">{k.name}</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 text-ink-2">No keys yet. Make one when your IT team is ready to connect.</p>
      )}

      <form onSubmit={create} noValidate className="mt-6 flex max-w-[560px] flex-wrap items-start gap-3">
        <Field label="New key name" value={name} error={attempted ? nameError ?? undefined : undefined} onChange={(e) => setName(e.target.value)} hint="Name it after what will use it, for example Branch app." className="min-w-[240px] flex-1" />
        <Button type="submit" loading={busy} className="mt-[26px]">
          Make a key
        </Button>
      </form>
    </Card>
  );
}

/** I7.6: the link from the bank's app, single sign-on settings, and the API keys with a rotate button. */
export default function SignInKeys() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Integration" description="Connect your bank's data and sign-in." />
      <IntegrationTabs />
      <Async result={result}>
        {(data: SignInSettings) => (
          <div className="space-y-8">
            <Handoff url={data.handoffUrl} />
            <SsoForm initial={data.sso} />
            <Keys initial={data.keys} />
          </div>
        )}
      </Async>
    </>
  );
}
