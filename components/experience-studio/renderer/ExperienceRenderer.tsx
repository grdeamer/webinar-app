import type { Experience } from "../types/experience";

export function ExperienceRenderer({
  experience,
}: {
  experience: Experience;
}) {
  return (
    <main className="min-h-screen bg-black text-white">
      {experience.sections.map((section) => {
        if (section.visible === false) return null;

        return (
          <section key={section.id} data-section-type={section.type}>
            {section.type}
          </section>
        );
      })}
    </main>
  );
}
