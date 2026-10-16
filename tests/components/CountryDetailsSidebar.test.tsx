import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CountryDetailsSidebar } from "@/components/map/CountryDetailsSidebar";
import { CountryTooltip } from "@/components/map/CountryTooltip";
import { HungerLegend } from "@/components/map/HungerLegend";
import { kenyaObservation, makeCountry, makeDataset } from "./fixtures";

describe("CountryDetailsSidebar", () => {
  it("renders the country's hunger data, period, severity and attribution", () => {
    render(
      <CountryDetailsSidebar
        country={makeCountry()}
        observation={kenyaObservation}
        dataset={makeDataset()}
        onClose={() => {}}
      >
        <p>ngo-list-slot</p>
      </CountryDetailsSidebar>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Kenya" })).toBeInTheDocument();
    expect(screen.getByText("34.9%")).toBeInTheDocument();
    expect(screen.getByText(/2022–2024 \(3-year average\)/)).toBeInTheDocument();
    expect(screen.getByText(/· High/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "World Bank, World Development Indicators" })).toHaveAttribute(
      "href",
      "https://data.worldbank.org/indicator/SN.ITK.DEFC.ZS",
    );
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toBeInTheDocument();
    expect(screen.getByText(/bundled snapshot/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Flag of Kenya" })).toHaveAttribute(
      "src",
      "https://flagcdn.com/w80/ke.png",
    );
    expect(screen.getByText("ngo-list-slot")).toBeInTheDocument();
  });

  it("explains the reporting floor", () => {
    render(
      <CountryDetailsSidebar
        country={makeCountry({ name: "France", iso_a3: "FRA", iso_a3_eh: "FRA", adm0_a3: "FRA", iso_a2: "FR" })}
        observation={{ ...kenyaObservation, countryCode: "FRA", value: 2.5, isBelowReportingFloor: true }}
        dataset={makeDataset()}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("< 2.5%")).toBeInTheDocument();
    expect(screen.getByText(/publishes 2.5% as a floor/)).toBeInTheDocument();
  });

  it("shows a no-data state without inventing a value", () => {
    render(
      <CountryDetailsSidebar
        country={makeCountry({ name: "Somalia", iso_a3: "SOM", iso_a3_eh: "SOM", adm0_a3: "SOM", iso_a2: "SO" })}
        observation={undefined}
        dataset={makeDataset()}
        onClose={() => {}}
      >
        <p>ngo-list-slot</p>
      </CountryDetailsSidebar>,
    );
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.getByText("No published estimate for this country.")).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.getByText("ngo-list-slot")).toBeInTheDocument();
  });

  it("disables NGO lookup for territories without a country code", () => {
    render(
      <CountryDetailsSidebar
        country={makeCountry({ name: "Somaliland", iso_a3: "-99", iso_a3_eh: "-99", iso_a2: "-99", adm0_a3: "SOL", code: null })}
        observation={undefined}
        dataset={makeDataset()}
        onClose={() => {}}
      >
        <p>ngo-list-slot</p>
      </CountryDetailsSidebar>,
    );
    expect(screen.getByText(/not reported separately/)).toBeInTheDocument();
    expect(screen.getByText(/no ISO country code/)).toBeInTheDocument();
    expect(screen.queryByText("ngo-list-slot")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("closes via the button and the Escape key", () => {
    const onClose = vi.fn();
    render(
      <CountryDetailsSidebar country={makeCountry()} observation={kenyaObservation} dataset={makeDataset()} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close country details" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("CountryTooltip", () => {
  const bounds = { width: 800, height: 600 };

  it("shows the indicator value and period", () => {
    render(
      <CountryTooltip
        country={makeCountry()}
        observation={kenyaObservation}
        indicator={{ shortName: "Undernourishment" }}
        position={{ x: 100, y: 100 }}
        bounds={bounds}
      />,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Kenya");
    expect(tooltip).toHaveTextContent("34.9%");
    expect(tooltip).toHaveTextContent("(High)");
    expect(tooltip).toHaveTextContent("2022–2024 (3-year average)");
  });

  it("shows a clear no-data message", () => {
    render(
      <CountryTooltip
        country={makeCountry()}
        observation={undefined}
        indicator={{ shortName: "Undernourishment" }}
        position={{ x: 100, y: 100 }}
        bounds={bounds}
      />,
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent("No data available");
    expect(screen.getByRole("tooltip")).toHaveTextContent("No published estimate for this country.");
  });

  it("flips position to stay within the container", () => {
    render(
      <CountryTooltip
        country={makeCountry()}
        observation={kenyaObservation}
        indicator={{ shortName: "Undernourishment" }}
        position={{ x: 790, y: 590 }}
        bounds={bounds}
      />,
    );
    const style = screen.getByRole("tooltip").style;
    expect(Number.parseFloat(style.left)).toBeLessThan(790);
    expect(Number.parseFloat(style.top)).toBeLessThan(590);
  });
});

describe("HungerLegend", () => {
  it("lists every class, the no-data swatch and the period", () => {
    render(<HungerLegend dataset={makeDataset()} periodLabel="2022–2024 (3-year average)" />);
    expect(screen.getByRole("heading", { name: "Prevalence of undernourishment" })).toBeInTheDocument();
    expect(screen.getByText(/2022–2024/)).toBeInTheDocument();
    expect(screen.getByText("< 2.5%")).toBeInTheDocument();
    expect(screen.getByText("≥ 35%")).toBeInTheDocument();
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.getByText(/does not mean zero hunger/)).toBeInTheDocument();
  });
});
