import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { supabaseBankLookup } from "./lookup";

const row = {
  id: "b1",
  subdomain: "seva",
  name: "Seva Co-operative Bank",
  install_name: "Seva Money",
  logo: null,
  brand_colour: "#0f6b4a",
  on_brand_colour: "#ffffff",
  disclaimer: "Regulated by the RBI. Not investment advice.",
  english: true,
  hindi: true,
  advisor: "rules",
};

const clientReturning = (result: { data: unknown; error: { message: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe("supabaseBankLookup", () => {
  it("asks bank_public for the address, and reads the first row", async () => {
    const { client, rpc } = clientReturning({ data: [row], error: null });
    const bank = await supabaseBankLookup(client)("seva");
    expect(rpc).toHaveBeenCalledWith("bank_public", { p_subdomain: "seva" });
    expect(bank).toMatchObject({ name: "Seva Co-operative Bank", brandColour: "#0F6B4A" });
  });

  it("is null when there is no such bank, or it is not live (the database returns no row for both)", async () => {
    const { client } = clientReturning({ data: [], error: null });
    expect(await supabaseBankLookup(client)("nobody")).toBeNull();
    const none = clientReturning({ data: null, error: null });
    expect(await supabaseBankLookup(none.client)("nobody")).toBeNull();
  });

  it("is null for a row that is not a valid bank, rather than a half-built one", async () => {
    const { client } = clientReturning({ data: [{ ...row, brand_colour: "not a colour" }], error: null });
    expect(await supabaseBankLookup(client)("seva")).toBeNull();
  });

  it("rejects when the call fails, so the screen can offer a retry", async () => {
    const { client } = clientReturning({ data: null, error: { message: "network down" } });
    await expect(supabaseBankLookup(client)("seva")).rejects.toThrow("network down");
  });
});
