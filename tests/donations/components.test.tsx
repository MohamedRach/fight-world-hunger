import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { DonationForm } from "@/components/donations/DonationForm";
import { DonationStatusUpdateForm } from "@/components/donations/DonationStatusUpdateForm";
import { DonationProgress } from "@/components/donations/DonationProgress";
import { DonationTimeline } from "@/components/donations/DonationTimeline";
import { DonationList } from "@/components/donations/DonationList";
import type { DonationView } from "@/features/donations/types";

const NGO = { id: "ngo-1", slug: "food-for-all", name: "Food For All" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DonationForm", () => {
  it("validates the amount before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<DonationForm ngo={NGO} defaultAnonymous={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Pledge donation" }));

    expect(await screen.findByText("Please fix the highlighted fields.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Amount/ })).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pre-checks anonymity from the profile preference", () => {
    render(<DonationForm ngo={NGO} defaultAnonymous />);
    expect(screen.getByRole("checkbox", { name: /Donate anonymously/ })).toBeChecked();
  });

  it("creates the donation and opens its tracking page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: "don-1" } }, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<DonationForm ngo={NGO} defaultAnonymous={false} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Amount/ }), {
      target: { value: "42.50" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Currency/ }), {
      target: { value: "GBP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pledge donation" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/donations/don-1?created=1"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/donations");
    expect(JSON.parse(init.body)).toEqual({
      ngoId: "ngo-1",
      amount: 42.5,
      currency: "GBP",
      message: null,
      isAnonymous: false,
    });
  });

  it("shows server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json({ error: { code: "FORBIDDEN", message: "Only individual accounts can make donations." } }, 403),
      ),
    );
    render(<DonationForm ngo={NGO} defaultAnonymous={false} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Amount/ }), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pledge donation" }));

    expect(
      await screen.findByText("Only individual accounts can make donations."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("DonationStatusUpdateForm", () => {
  it("offers only the allowed next statuses and requires a choice", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <DonationStatusUpdateForm donationId="don-1" allowedNextStatuses={["CONFIRMED", "REJECTED"]} />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    expect(await screen.findByText("Choose the new status")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the status and note, then refreshes the page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ data: { id: "don-1", status: "CONFIRMED" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <DonationStatusUpdateForm donationId="don-1" allowedNextStatuses={["CONFIRMED", "REJECTED"]} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Confirmed/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Note for the donor/ }), {
      target: { value: "Thank you!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Status updated to confirmed");
    expect(refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/donations/don-1/status");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "CONFIRMED", note: "Thank you!" });
  });

  it("shows a rejected transition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: "A rejected donation can't be marked as confirmed.",
            },
          },
          409,
        ),
      ),
    );
    render(<DonationStatusUpdateForm donationId="don-1" allowedNextStatuses={["CONFIRMED"]} />);
    fireEvent.click(screen.getByRole("radio", { name: /Confirmed/ }));
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    expect(
      await screen.findByText("A rejected donation can't be marked as confirmed."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("tracking display", () => {
  it("marks the current step of the progress tracker", () => {
    render(<DonationProgress status="IN_PROGRESS" />);
    const current = screen.getByRole("listitem", { current: "step" });
    expect(current).toHaveTextContent("In progress");
  });

  it("explains stopped donations instead of showing steps", () => {
    render(<DonationProgress status="REJECTED" />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("The NGO declined the pledge.")).toBeInTheDocument();
  });

  it("renders each history entry with its note", () => {
    render(
      <DonationTimeline
        ngoName="Food For All"
        history={[
          {
            id: "h1",
            previousStatus: null,
            newStatus: "PENDING",
            note: null,
            actor: "DONOR",
            createdAt: "2026-10-01T10:00:00.000Z",
          },
          {
            id: "h2",
            previousStatus: "PENDING",
            newStatus: "CONFIRMED",
            note: "Thanks for your support",
            actor: "NGO",
            createdAt: "2026-10-02T12:30:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Donation pledged by the donor.")).toBeInTheDocument();
    expect(
      screen.getByText("Moved from pending to confirmed by Food For All."),
    ).toBeInTheDocument();
    expect(screen.getByText("Thanks for your support")).toBeInTheDocument();
    expect(screen.getByText("2 Oct 2026, 12:30 UTC")).toBeInTheDocument();
  });

  it("shows anonymous donors as such to NGOs", () => {
    const donation: DonationView = {
      id: "don-1",
      ngo: NGO,
      amount: 25,
      currency: "USD",
      message: null,
      isAnonymous: true,
      donorName: null,
      status: "PENDING",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    render(<DonationList donations={[donation]} perspective="NGO" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/donations/don-1");
    expect(link).toHaveTextContent("Anonymous donor");
    expect(link).toHaveTextContent("US$25.00");
  });
});
