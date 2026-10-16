import type { NgoPublicProfile } from "@/features/ngos/types";
import { countryName } from "@/features/ngos/countries";
import { NgoSection } from "./NgoSection";

export function NgoCountriesSection({ ngo }: { ngo: NgoPublicProfile }) {
  return (
    <NgoSection title="Where we operate">
      <ul className="flex flex-wrap gap-2" aria-label="Countries of operation">
        {ngo.operatingCountryCodes.map((code) => (
          <li
            key={code}
            className="rounded-full bg-black/5 px-3 py-1 text-sm dark:bg-white/10"
          >
            {countryName(code)}
          </li>
        ))}
      </ul>
    </NgoSection>
  );
}
