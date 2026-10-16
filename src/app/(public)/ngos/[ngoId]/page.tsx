import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicNgoProfile } from "@/features/ngos/service";
import { NgoProfileHeader } from "@/components/ngos/NgoProfileHeader";
import { NgoMissionSection } from "@/components/ngos/NgoMissionSection";
import { NgoCountriesSection } from "@/components/ngos/NgoCountriesSection";
import { NgoImpactSection } from "@/components/ngos/NgoImpactSection";
import { NgoContactSection } from "@/components/ngos/NgoContactSection";

export async function generateMetadata(
  props: PageProps<"/ngos/[ngoId]">,
): Promise<Metadata> {
  const { ngoId } = await props.params;
  const ngo = await getPublicNgoProfile(decodeURIComponent(ngoId));
  if (!ngo) return { title: "NGO not found" };
  return { title: ngo.name, description: ngo.shortDescription };
}

export default async function NgoProfilePage(props: PageProps<"/ngos/[ngoId]">) {
  const { ngoId } = await props.params;
  const ngo = await getPublicNgoProfile(decodeURIComponent(ngoId));
  if (!ngo) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <NgoProfileHeader ngo={ngo} />

      <div className="mt-8 grid gap-6">
        <NgoMissionSection ngo={ngo} />
        <NgoCountriesSection ngo={ngo} />
        <NgoImpactSection ngo={ngo} />
        <NgoContactSection ngo={ngo} />
      </div>

      <div className="mt-10 rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-6 text-center dark:border-emerald-400/30 dark:bg-emerald-400/10">
        <h2 className="text-xl font-semibold">Support {ngo.name}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-80">
          Your donation helps {ngo.name} continue its work.
        </p>
        {/* INTEGRATION PLACEHOLDER: link to Developer 4's donation flow once
            it exists (see docs/TEAM_DEVELOPMENT_GUIDE.md §4). */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Donations are coming soon"
          className="mt-4 cursor-not-allowed rounded-full bg-emerald-600 px-6 py-2.5 font-medium text-white opacity-60 dark:bg-emerald-500"
        >
          Support this NGO — coming soon
        </button>
      </div>
    </main>
  );
}
