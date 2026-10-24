import { HomeExperience } from "@/components/HomeExperience";
import { profile, stackGroups } from "@/data/profile";

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.title,
  email: `mailto:${profile.email}`,
  telephone: profile.phone,
  address: {
    "@type": "PostalAddress",
    addressLocality: profile.location.split(",")[0]?.trim(),
    addressCountry: "IN",
  },
  sameAs: [profile.links.instagram, profile.links.linkedin, profile.links.github],
  knowsAbout: stackGroups.flatMap((group) => [...group.items]),
};

export default function HomePage() {
  const safeJsonLd = JSON.stringify(personSchema).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
      <HomeExperience />
    </>
  );
}
