import type { NgoPublicProfile } from "@/features/ngos/types";
import { NgoSection } from "./NgoSection";

const SOCIAL_LABELS = {
  twitter: "Twitter / X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
} as const;

export function NgoContactSection({ ngo }: { ngo: NgoPublicProfile }) {
  const socials = Object.entries(ngo.socialLinks ?? {}) as Array<
    [keyof typeof SOCIAL_LABELS, string]
  >;
  const hasContent =
    ngo.website || ngo.contactEmail || ngo.contactPhone || socials.length > 0;
  if (!hasContent) return null;

  return (
    <NgoSection title="Contact and links">
      <dl className="space-y-2">
        {ngo.website && (
          <div>
            <dt className="text-sm font-medium opacity-70">Website</dt>
            <dd>
              <a
                href={ngo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80"
              >
                {ngo.website}
              </a>
            </dd>
          </div>
        )}
        {ngo.contactEmail && (
          <div>
            <dt className="text-sm font-medium opacity-70">Email</dt>
            <dd>
              <a
                href={`mailto:${ngo.contactEmail}`}
                className="underline underline-offset-2 hover:opacity-80"
              >
                {ngo.contactEmail}
              </a>
            </dd>
          </div>
        )}
        {ngo.contactPhone && (
          <div>
            <dt className="text-sm font-medium opacity-70">Phone</dt>
            <dd>{ngo.contactPhone}</dd>
          </div>
        )}
        {socials.length > 0 && (
          <div>
            <dt className="text-sm font-medium opacity-70">Social media</dt>
            <dd className="flex flex-wrap gap-3">
              {socials.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {SOCIAL_LABELS[key]}
                </a>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </NgoSection>
  );
}
