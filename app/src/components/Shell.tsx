import { Outlet } from "react-router";
import { useOnline } from "../hooks/useOnline";
import OfflineScreen from "./OfflineScreen";
import TabBar from "./TabBar";
import UpdatePrompt from "./UpdatePrompt";

export default function Shell() {
  const { online, retry } = useOnline();

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-page">
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
        {online ? <Outlet /> : <OfflineScreen onRetry={retry} />}
      </main>
      <TabBar />
      <UpdatePrompt />
    </div>
  );
}
