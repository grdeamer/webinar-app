import type { RegistrationFlow } from "../types/registration";

export function RegistrationFlowPreview({
  flow,
}: {
  flow: RegistrationFlow;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white">
      <p className="text-xs uppercase tracking-[0.28em] text-white/40">
        Registration Flow
      </p>

      <h2 className="mt-3 text-2xl font-semibold">{flow.title}</h2>

      <div className="mt-6 space-y-3">
        {flow.fields.map((field) => (
          <div key={field.id} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-medium">{field.label}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
              {field.type}
              {field.required ? " · Required" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}