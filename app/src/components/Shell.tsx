import { Outlet } from "react-router";
import { BankBar, BankFooter } from "../bank/BankChrome";
import { useBank } from "../bank/BankProvider";
import { useOnline } from "../hooks/useOnline";
import OfflineScreen from "./OfflineScreen";
import TabBar from "./TabBar";
import UpdatePrompt from "./UpdatePrompt";

export default function Shell() {
  const { online, retry } = useOnline();
  // A bank's bar sits above everything and takes the notch's space itself.
  const bank = useBank();

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-page">
      <BankBar />
      <main className={`flex-1 overflow-y-auto ${bank ? "" : "pt-[env(safe-area-inset-top)]"}`}>
        {online ? <Outlet /> : <OfflineScreen onRetry={retry} />}
        <BankFooter />
      </main>
      <TabBar />
      <UpdatePrompt />
    </div>
  );
}
