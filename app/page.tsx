import Link from 'next/link';
import { Blocks, Cloud, History, ShieldCheck, Users, Workflow } from 'lucide-react';

export default function Home() {
  return <main>
    <section className="hero">
      <div>
        <div className="eyebrow">Collaborative engineering workspace</div>
        <h1>Code together.<br />Run safely.<br /><em>Remember everything.</em></h1>
        <p>CodeRoom brings multiplayer editing, isolated cloud execution and replayable coding sessions into one deliberate workspace for pair programming, interviews and team exercises.</p>
        <div className="hero-actions"><Link href="/register" className="button button-gold">Create a room</Link><Link href="/login" className="button button-ghost">Sign in</Link></div>
      </div>
      <div className="hero-panel">
        <div className="hero-panel-top"><div className="traffic"><span className="dot"/><span className="dot"/><span className="dot"/></div><span className="badge badge-gold">Live workspace</span></div>
        <div className="mock-editor"><div className="mock-sidebar"><div className="active">main.py</div><div>tests.py</div><div>README.md</div></div><div className="mock-code"><div><strong>def</strong> solve(data):</div><div>&nbsp;&nbsp;&nbsp;&nbsp;window = {'{}'}</div><div>&nbsp;&nbsp;&nbsp;&nbsp;<strong>for</strong> value <strong>in</strong> data:</div><div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;window[value] = True</div><div>&nbsp;&nbsp;&nbsp;&nbsp;<strong>return</strong> window</div><br /><div style={{color:'var(--success)'}}>✓ 8 tests passed</div><div style={{color:'var(--muted)'}}>2 collaborators online · 41s</div></div></div>
      </div>
    </section>
    <section className="feature-strip">
      <article className="feature-card"><div className="icon-badge"><Users size={18}/></div><h3>Shared state</h3><p>CRDT-based collaboration keeps multiple editors converged without treating one user's keystrokes as the source of truth.</p></article>
      <article className="feature-card"><div className="icon-badge"><ShieldCheck size={18}/></div><h3>Isolated execution</h3><p>Each run goes through a queue and disposable sandbox with CPU, memory, process and network controls.</p></article>
      <article className="feature-card"><div className="icon-badge"><History size={18}/></div><h3>Replayable sessions</h3><p>Edits, test runs and milestones form a timeline you can inspect after the room ends.</p></article>
      <article className="feature-card"><div className="icon-badge"><Cloud size={18}/></div><h3>Cloud-ready workers</h3><p>Separate control, collaboration and execution planes make room traffic and sandbox workloads independently scalable.</p></article>
      <article className="feature-card"><div className="icon-badge"><Workflow size={18}/></div><h3>Interview mode</h3><p>Use private tests, controlled permissions and a clear execution history for structured technical interviews.</p></article>
      <article className="feature-card"><div className="icon-badge"><Blocks size={18}/></div><h3>Designed for teams</h3><p>Pair sessions, team rooms and review workflows share the same room model instead of becoming separate products.</p></article>
    </section>
  </main>;
}
