export function StepRail({ current, steps }: { current: number; steps: readonly string[] }) {
  return (
    <aside className="step-rail">
      {steps.map((step, index) => (
        <div className={`step ${index === current ? "active" : ""} ${index < current ? "done" : ""}`} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </aside>
  );
}
