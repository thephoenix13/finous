import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

async function open(route = "/help", api = createMockConsoleApi()) {
  const view = renderConsole({ route, api, as: "readonly" });
  await screen.findByRole("heading", { name: "Help" });
  return { ...view, user: userEvent.setup() };
}

describe("Help (I11.1)", () => {
  it("is open to every role, and accessible", async () => {
    const { container } = await open();
    expect(screen.getByRole("heading", { name: "Common questions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Raise a ticket" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("opens an answer when its question is chosen, and closes it again", async () => {
    const { user, container } = await open();
    const question = screen.getByText("Why is my brand colour blocked?");
    const details = question.closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await user.click(question);
    expect(details.open).toBe(true);
    expect(screen.getByText(/try white text on a darker colour/)).toBeInTheDocument();
    await user.click(question);
    expect(details.open).toBe(false);
    expect(container.querySelectorAll("details")).toHaveLength(5);
  });

  it("defaults the topic to a question, and to a problem when sent from the error screen", async () => {
    const first = await open();
    expect(screen.getByLabelText("Topic")).toHaveValue("question");
    first.unmount();
    await open("/help?topic=problem");
    expect(screen.getByLabelText("Topic")).toHaveValue("problem");
  });

  it("ignores a topic it doesn't know", async () => {
    await open("/help?topic=nonsense");
    expect(screen.getByLabelText("Topic")).toHaveValue("question");
  });

  it("asks for a subject and a message, together, and raises nothing until both are there", async () => {
    const { user, api } = await open();
    await user.click(screen.getByRole("button", { name: "Raise a ticket" }));
    expect(await screen.findByText("Say what it's about in a few words.")).toBeInTheDocument();
    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    expect(api.saved.tickets).toHaveLength(0);
    await user.type(screen.getByLabelText("Subject"), "Colours");
    await user.type(screen.getByLabelText("Message"), "short");
    await user.click(screen.getByRole("button", { name: "Raise a ticket" }));
    expect(screen.queryByText("Say what it's about in a few words.")).not.toBeInTheDocument();
    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
  });

  it("raises the ticket, shows its number, and empties the form for the next one", async () => {
    const { user, api } = await open("/help?topic=problem");
    await user.type(screen.getByLabelText("Subject"), "  Logo won't upload ");
    await user.type(screen.getByLabelText("Message"), "  It says the file is too big. It is 100 KB.  ");
    await user.click(screen.getByRole("button", { name: "Raise a ticket" }));
    expect(await screen.findByText(/Your ticket number is/)).toHaveTextContent("T-1001");
    expect(api.saved.tickets).toEqual([{ topic: "problem", subject: "Logo won't upload", message: "It says the file is too big. It is 100 KB." }]);
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.queryByText(/Say what it's about/)).not.toBeInTheDocument();
  });

  it("keeps the words and says so when the ticket can't be raised", async () => {
    const api = createMockConsoleApi();
    const { user } = await open("/help", api);
    await user.type(screen.getByLabelText("Subject"), "Colours");
    await user.type(screen.getByLabelText("Message"), "The picker does nothing for me.");
    api.failNext("raiseTicket");
    await user.click(screen.getByRole("button", { name: "Raise a ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
    expect(screen.getByLabelText("Message")).toHaveValue("The picker does nothing for me.");
    expect(screen.queryByText(/Your ticket number/)).not.toBeInTheDocument();
  });
});
