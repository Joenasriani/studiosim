import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero">
      <div>
        <div className="kicker">Studio practice system</div>
        <h1>Train production judgment inside live browser workrooms.</h1>
        <p>
          StudioSim lets learners shape timing, easing, camera rhythm, edit structure, and production choices inside WebGL/WebXR practice rooms, then grades what actually changed.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link className="btn primary" href="/signup">Open StudioSim</Link>
          <Link className="btn" href="/courses">Enter the workrooms</Link>
        </div>
      </div>
      <div className="heroStage" aria-label="StudioSim timing-room preview">
        <div className="heroNode one" />
        <div className="heroNode two" />
        <div className="heroPanel">
          <span>Curve choice affects acceleration.</span>
          <span>Overshoot controls the settle.</span>
          <span>Progress saves after evaluation.</span>
        </div>
      </div>
    </section>
  );
}
