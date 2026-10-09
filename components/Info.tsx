import { ArrowUpDown, BarChart3, BookOpen, Check, Flame, Lightbulb, Target, Timer, Trophy } from 'lucide-react';
import { useState } from 'react';
import { getStats, type Mode } from '../lib/game';
import { copy } from '../lib/i18n';
import { useProgress } from '../lib/store';
import { Modal, Pokeball } from './ui';
import { useRecall } from '../lib/recall-store';
import { recallCopy } from '../lib/recall-i18n';
import { RecallRecords } from './Recall';

export function Rules({ onClose }: { onClose: () => void }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  const r = recallCopy[progress.language];
  return <Modal title={t.rules} onClose={onClose}>
    <p className="modal-intro">{t.ruleIntro}</p>
    <div className="rule-list">
      <div><span className="rule-icon mint"><Check /></span><p>{t.ruleTypes}</p></div>
      <div><span className="rule-icon sky"><ArrowUpDown /></span><p>{t.ruleNumbers}</p></div>
      <div><span className="rule-icon lavender"><Pokeball /></span><p>{t.ruleDaily}</p></div>
      <div><span className="rule-icon yellow"><Lightbulb /></span><p>{t.ruleHint}</p></div>
      <div><span className="rule-icon sky"><BookOpen /></span><p>{r.ruleCompletion}</p></div>
      <div><span className="rule-icon yellow"><Timer /></span><p>{r.ruleSprint}</p></div>
    </div>
    <button className="button coral full" onClick={onClose}>{t.understood}<span>→</span></button>
  </Modal>;
}

export function Statistics({ onClose }: { onClose: () => void }) {
  const { progress } = useProgress();
  const t = copy[progress.language];
  const r = recallCopy[progress.language];
  const { progress: recall } = useRecall();
  const [mode, setMode] = useState<Mode | 'completion' | 'sprint'>('kanto');
  const memory = mode === 'sprint' || mode === 'completion';
  const stats = getStats(progress, memory ? 'kanto' : mode);
  const max = Math.max(1, ...stats.distribution);
  return <Modal title={t.stats} onClose={onClose}>
    <div className="segmented stats-modes" aria-label={t.stats}>{(['kanto', 'complete', 'practice', 'completion', 'sprint'] as const).map(m => <button key={m} className={m === mode ? 'active' : ''} aria-pressed={m === mode} onClick={() => setMode(m)}>{m === 'sprint' || m === 'completion' ? r[m] : t[m]}</button>)}</div>
    {memory ? <RecallRecords progress={recall} mode={mode} language={progress.language} /> : <><div className="stat-grid">
      {[[BarChart3, t.played, stats.played], [Target, t.winRate, `${stats.winRate}%`], [Trophy, t.wins, stats.wins], [Lightbulb, t.assistedWins, stats.assisted], ...(mode === 'practice' ? [] : [[Flame, t.streak, stats.streak], [Trophy, t.best, stats.best]])].map(([Icon, label, value]) => {
        const Symbol = Icon as typeof Trophy;
        return <div key={String(label)} className="stat-tile"><Symbol size={18} /><strong>{String(value)}</strong><span>{String(label)}</span></div>;
      })}
    </div>
    <h3 className="small-heading">{t.distribution}</h3>
    {stats.played === 0 && <p className="muted">{t.noStats}</p>}
    <div className="distribution">{stats.distribution.map((value, index) => <div key={index}><span>{index + 1}</span><div><span style={{ width: `${Math.max(9, value / max * 100)}%` }} className={value ? 'filled' : ''}>{value}</span></div></div>)}</div>
    </>}
  </Modal>;
}
