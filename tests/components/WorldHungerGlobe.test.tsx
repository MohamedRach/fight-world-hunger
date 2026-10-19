import { Activity, createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WorldHungerGlobe, {
  type GlobeViewHandle,
  type WorldHungerGlobeProps,
} from "@/components/map/WorldHungerGlobe";
import { makeCountry } from "./fixtures";

const { instances } = vi.hoisted(() => ({
  instances: [] as {
    destroyed: boolean;
    controls: { autoRotate: boolean };
    pointOfView: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock("react-globe.gl", async () => {
  const { forwardRef, useEffect, useImperativeHandle, useState } = await import("react");

  return {
    default: forwardRef(function MockGlobe(
      { onGlobeReady }: { onGlobeReady: () => void },
      ref,
    ) {
      const [instance] = useState(() => {
        const value = {
          destroyed: false,
          controls: { autoRotate: false },
          pointOfView: vi.fn(() => ({ lat: 15, lng: 10, altitude: 2.2 })),
        };
        instances.push(value);
        return value;
      });
      useImperativeHandle(ref, () => ({
        controls: () => instance.controls,
        pointOfView: instance.pointOfView,
      }), [instance]);
      useEffect(() => {
        onGlobeReady();
      }, [instance, onGlobeReady]);
      useEffect(() => {
        // Like react-globe.gl, teardown disposes an imperative renderer
        // that cannot be restored by re-running its effects.
        return () => { instance.destroyed = true; };
      }, [instance]);
      return <div data-testid="globe" />;
    }),
  };
});

function makeProps(): WorldHungerGlobeProps {
  return {
    polygons: [{ kind: "country", country: makeCountry() }],
    colorForPolygon: () => "#ffffff",
    hoveredKey: null,
    selectedKey: null,
    interactionActive: false,
    onHover: vi.fn(),
    onSelect: vi.fn(),
    width: 800,
    height: 600,
  };
}

beforeEach(() => {
  instances.length = 0;
});

describe("WorldHungerGlobe lifecycle", () => {
  it("creates a fresh renderer whenever a cached map page becomes visible again", () => {
    const props = makeProps();
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <WorldHungerGlobe {...props} />
      </Activity>
    );
    const { rerender, unmount } = render(view("visible"));
    expect(instances).toHaveLength(1);

    for (let visit = 1; visit <= 3; visit++) {
      const previous = instances.at(-1)!;
      rerender(view("hidden"));
      expect(previous.destroyed).toBe(true);

      rerender(view("visible"));
      expect(screen.getByTestId("globe")).toBeVisible();
      expect(instances).toHaveLength(visit + 1);
      expect(instances.at(-1)?.destroyed).toBe(false);
    }

    unmount();
    expect(instances.every((instance) => instance.destroyed)).toBe(true);
  });

  it("keeps the same renderer for resizing and selection changes", () => {
    const props = makeProps();
    const { rerender } = render(<WorldHungerGlobe {...props} />);
    const instance = instances[0];

    rerender(
      <WorldHungerGlobe {...props} width={1000} interactionActive selectedKey="country:KEN" />,
    );
    expect(instances).toHaveLength(1);
    expect(instance.destroyed).toBe(false);
    expect(instance.controls.autoRotate).toBe(false);
  });

  it("reconnects camera controls to the fresh renderer after returning", () => {
    const handleRef = createRef<GlobeViewHandle>();
    const props = { ...makeProps(), handleRef };
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <WorldHungerGlobe {...props} />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    const previous = instances[0];
    rerender(view("hidden"));
    rerender(view("visible"));

    previous.pointOfView.mockClear();
    const current = instances.at(-1)!;
    handleRef.current?.focusCountry(makeCountry());
    expect(current.pointOfView).toHaveBeenLastCalledWith(
      { lat: 0.6, lng: 37.8, altitude: 1.6 },
      900,
    );
    expect(previous.pointOfView).not.toHaveBeenCalled();
  });

  it("keeps auto-rotation paused when returning with a country selected", () => {
    const props = { ...makeProps(), interactionActive: true, selectedKey: "country:KEN" };
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <WorldHungerGlobe {...props} />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    rerender(view("hidden"));
    rerender(view("visible"));

    expect(instances.at(-1)?.destroyed).toBe(false);
    expect(instances.at(-1)?.controls.autoRotate).toBe(false);
  });
});
