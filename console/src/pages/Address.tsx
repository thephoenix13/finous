import { useState, type FormEvent } from "react";
import { ApiError } from "../api/errors";
import { useApi } from "../api/context";
import type { AppAddress, Branding as BrandingData, ConsoleApi } from "../api/types";
import { useApiData } from "../api/useApiData";
import { useSaver } from "../lib/useSaver";
import { APP_DOMAIN, INSTALL_NAME_SOFT_LIMIT, validateInstallName, validateSubdomain } from "../lib/validate";
import { Field, PageHeader } from "../ui";
import SaveBar from "../ui/SaveBar";
import { Async } from "../ui/States";
import { HomeScreenPreview } from "./PhonePreview";
import SettingsTabs from "./SettingsTabs";

const load = async (api: ConsoleApi, options: { signal?: AbortSignal }) => {
  const [address, branding] = await Promise.all([api.address(options), api.branding(options)]);
  return { address, branding };
};

function AddressForm({ initial, branding }: { initial: AppAddress; branding: BrandingData }) {
  const api = useApi();
  const [subdomain, setSubdomain] = useState(initial.subdomain);
  const [installName, setInstallName] = useState(initial.installName);
  const [attempted, setAttempted] = useState(false);
  const [taken, setTaken] = useState(false);
  const saver = useSaver();

  const cleaned = subdomain.trim().toLowerCase();
  const subdomainError = taken ? "Another bank already uses this address. Choose another." : validateSubdomain(cleaned);
  const nameError = validateInstallName(installName);
  const long = installName.trim().length > INSTALL_NAME_SOFT_LIMIT && !nameError;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (validateSubdomain(cleaned) || nameError) return;
    await saver.run(
      async () => {
        if (!(await api.addressAvailable(cleaned))) {
          setTaken(true);
          throw new ApiError("conflict");
        }
        await api.saveAddress({ subdomain: cleaned, installName: installName.trim() });
      },
      (e) => (e instanceof ApiError && e.code === "conflict" ? "That address is taken." : "We couldn't save that. Your changes are still here. Try again."),
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <Field
          label="Web address"
          value={subdomain}
          error={attempted || taken ? subdomainError ?? undefined : undefined}
          onChange={(e) => {
            setSubdomain(e.target.value);
            setTaken(false);
            saver.reset();
          }}
          suffix={`.${APP_DOMAIN}`}
          hint={`Customers open https://${cleaned || "your-bank"}.${APP_DOMAIN}. Lower case letters, digits and hyphens.`}
          autoComplete="off"
          spellCheck={false}
        />
        <Field
          label="Name shown under the icon"
          value={installName}
          error={attempted ? nameError ?? undefined : undefined}
          onChange={(e) => {
            setInstallName(e.target.value);
            saver.reset();
          }}
          hint={long ? `Phones may cut this off after about ${INSTALL_NAME_SOFT_LIMIT} characters.` : "What customers see when they add the app to their phone."}
        />
        <p className="text-[13px] text-ink-3">The icon is your logo from the Branding screen. Until you upload one, it shows the first letter of your bank's name.</p>
        <SaveBar state={saver.state} />
      </div>
      <HomeScreenPreview look={branding} installName={installName} />
    </form>
  );
}

/** I7.2: how customers reach the app and how it looks once installed on a phone. */
export default function Address() {
  const result = useApiData(load);
  return (
    <>
      <PageHeader title="Branding and app" description="Choose where customers open the app, and what it is called on their phone." />
      <SettingsTabs />
      <Async result={result}>{(data) => <AddressForm initial={data.address} branding={data.branding} />}</Async>
    </>
  );
}
