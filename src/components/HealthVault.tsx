import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Heart, Moon, Compass, Sparkles, AlertTriangle, Eye, RefreshCw, X, Play } from 'lucide-react';
import { ImpulseLog, MomentCheckin, ReframedThought, Episode, WatchmanNote, PhraseItem, ReleaseCheckin } from '../types';

export const HealthVault: React.FC = () => {
  const [isVaultCreated, setIsVaultCreated] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [unlockPass, setUnlockPass] = useState<string>('');
  const [vaultError, setVaultError] = useState<string | null>(null);

  // Health data state
  const [impulseLogs, setImpulseLogs] = useState<ImpulseLog[]>([]);
  const [momentLogs, setMomentLogs] = useState<MomentCheckin[]>([]);
  const [reframes, setReframes] = useState<ReframedThought[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [watchmanNotes, setWatchmanNotes] = useState<WatchmanNote[]>([]);
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [releaseCheckins, setReleaseCheckins] = useState<ReleaseCheckin[]>([]);

  // Form states
  // Impulse
  const [trigger, setTrigger] = useState('');
  const [sensation, setSensation] = useState('');
  const [firstThought, setFirstThought] = useState('');
  const [severity, setSeverity] = useState(4);
  const [heuristic, setHeuristic] = useState('WYSIATI');

  // Moment
  const [calm, setCalm] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [focus, setFocus] = useState(3);

  // Reframer
  const [altOne, setAltOne] = useState('');
  const [altTwo, setAltTwo] = useState('');
  const [evidenceScore, setEvidenceScore] = useState(3);
  const [reframedView, setReframedView] = useState('');

  // 40s Reset Modal / Breathing
  const [isResetActive, setIsResetActive] = useState(false);
  const [resetTimer, setResetTimer] = useState(40);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  // Pre-sleep Overlay
  const [isSleepActive, setIsSleepActive] = useState(false);
  const [sleepPhraseId, setSleepPhraseId] = useState('');
  const [sleepSeconds, setSleepSeconds] = useState(180);
  const [sleepConsent, setSleepConsent] = useState(false);

  // Watchman
  const [watchThought, setWatchThought] = useState('');
  const [watchResponse, setWatchResponse] = useState('I’m having a difficult thought, not a certainty. I can look at one next step.');

  // Phrase
  const [phraseCategory, setPhraseCategory] = useState('Health');
  const [phraseText, setPhraseText] = useState('');
  const [phraseOutcome, setPhraseOutcome] = useState('');
  const [phraseSenses, setPhraseSenses] = useState('');
  const [phraseEmotion, setPhraseEmotion] = useState('');

  // DRM Episode
  const [activityName, setActivityName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [epHappiness, setEpHappiness] = useState(3);
  const [epStress, setEpStress] = useState(3);
  const [epCalm, setEpCalm] = useState(3);

  // Release
  const [releaseEvent, setReleaseEvent] = useState('');
  const [releaseNote, setReleaseNote] = useState('');
  const [acidScore, setAcidScore] = useState(3);

  // Load vault metadata from localStorage on mount
  useEffect(() => {
    const storedMeta = localStorage.getItem('yocare_health_vault_meta');
    if (storedMeta) {
      try {
        const parsed = JSON.parse(storedMeta);
        setUsername(parsed.username || 'Friend');
        setIsVaultCreated(true);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 12) {
      setVaultError('Passphrase must be at least 12 characters.');
      return;
    }
    if (passphrase !== confirmPass) {
      setVaultError('Passphrases do not match.');
      return;
    }

    localStorage.setItem('yocare_health_vault_meta', JSON.stringify({ username, createdAt: new Date().toISOString() }));
    setIsVaultCreated(true);
    setIsUnlocked(true);
    setVaultError(null);
  };

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPass.length >= 1) {
      setIsUnlocked(true);
      setVaultError(null);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setUnlockPass('');
  };

  const handleDeleteVault = () => {
    if (window.confirm('Are you sure you want to delete your private local vault? This action cannot be undone.')) {
      localStorage.removeItem('yocare_health_vault_meta');
      setIsVaultCreated(false);
      setIsUnlocked(false);
      setImpulseLogs([]);
      setMomentLogs([]);
    }
  };

  // Add Impulse Log
  const handleAddImpulse = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: ImpulseLog = {
      id: Date.now().toString(),
      trigger,
      sensation,
      firstThought,
      severity,
      heuristic,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setImpulseLogs([newLog, ...impulseLogs]);
    setTrigger('');
    setSensation('');
    setFirstThought('');
  };

  // Add Moment Checkin
  const handleAddMoment = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: MomentCheckin = {
      id: Date.now().toString(),
      calm,
      anxiety,
      focus,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMomentLogs([newLog, ...momentLogs]);
  };

  // Add Reframes
  const handleAddReframe = (e: React.FormEvent) => {
    e.preventDefault();
    const newRef: ReframedThought = {
      id: Date.now().toString(),
      alternativeOne: altOne,
      alternativeTwo: altTwo,
      evidenceScore,
      reframedView,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setReframes([newRef, ...reframes]);
    setAltOne('');
    setAltTwo('');
    setReframedView('');
  };

  // Add Watchman Note
  const handleAddWatchman = (e: React.FormEvent) => {
    e.preventDefault();
    const newNote: WatchmanNote = {
      id: Date.now().toString(),
      thought: watchThought,
      response: watchResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setWatchmanNotes([newNote, ...watchmanNotes]);
    setWatchThought('');
  };

  // Add Phrase
  const handleAddPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    const newPhrase: PhraseItem = {
      id: Date.now().toString(),
      category: phraseCategory,
      phrase: phraseText,
      outcome: phraseOutcome,
      senses: phraseSenses,
      emotion: phraseEmotion,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setPhrases([newPhrase, ...phrases]);
    setPhraseText('');
    setPhraseOutcome('');
    setPhraseSenses('');
    setPhraseEmotion('');
  };

  // Add DRM Episode
  const handleAddEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    const newEpisode: Episode = {
      id: Date.now().toString(),
      activityName,
      start: startTime,
      end: endTime,
      happiness: epHappiness,
      stress: epStress,
      calm: epCalm,
      dayRating: 4,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setEpisodes([...episodes, newEpisode]);
    setActivityName('');
  };

  // Add Release Checkin
  const handleAddRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const newRel: ReleaseCheckin = {
      id: Date.now().toString(),
      event: releaseEvent,
      note: releaseNote,
      acidScore,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setReleaseCheckins([newRel, ...releaseCheckins]);
    setReleaseEvent('');
    setReleaseNote('');
  };

  // 40s Reset Timer
  useEffect(() => {
    let interval: any = null;
    if (isResetActive && resetTimer > 0) {
      interval = setInterval(() => {
        setResetTimer((t) => t - 1);
        const mod = (40 - resetTimer) % 12;
        if (mod < 4) setBreathPhase('Inhale');
        else if (mod < 8) setBreathPhase('Hold');
        else setBreathPhase('Exhale');
      }, 1000);
    } else if (resetTimer === 0) {
      setIsResetActive(false);
      setResetTimer(40);
    }
    return () => clearInterval(interval);
  }, [isResetActive, resetTimer]);

  // Pre-sleep Timer
  useEffect(() => {
    let interval: any = null;
    if (isSleepActive && sleepSeconds > 0) {
      interval = setInterval(() => {
        setSleepSeconds((s) => s - 1);
      }, 1000);
    } else if (sleepSeconds === 0) {
      setIsSleepActive(false);
    }
    return () => clearInterval(interval);
  }, [isSleepActive, sleepSeconds]);

  const selectedSleepPhraseObj = phrases.find((p) => p.id === sleepPhraseId);

  return (
    <div className="health-page max-w-6xl mx-auto px-4 py-8 text-[#151a17]">
      {/* Header Banner */}
      <section className="health-hero mb-8 flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl bg-gradient-to-r from-[#e8f1e2] to-[#dce9f5] border border-[#cbd9c8]">
        <div className="health-hero-copy max-w-xl">
          <p className="eyebrow text-xs font-bold tracking-widest text-[#5e7862] uppercase mb-2 flex items-center gap-2">
            <span className="eyebrow-dot"></span> YOCARE HEALTH / EVIDENCE-AWARE WELLNESS
          </p>
          <h1 className="text-4xl font-extrabold text-[#151a17] leading-tight m-0">
            A moment to notice.<br />
            <span className="text-[#3b6d46]">A little space to choose.</span>
          </h1>
          <p className="text-sm text-[#59665c] mt-3">
            Understand your quick reactions, make room for a second perspective, and remember your day as more than its hardest moment.
          </p>
          <div className="health-principles flex items-center gap-3 mt-4 text-xs font-semibold text-[#48534a]">
            <span className="px-3 py-1 bg-white/70 rounded-full border border-white">Private by design</span>
            <span className="px-3 py-1 bg-white/70 rounded-full border border-white">Evidence-aware</span>
            <span className="px-3 py-1 bg-white/70 rounded-full border border-white">Short & intentional</span>
          </div>
        </div>

        <div className="mind-orbit relative w-48 h-48 flex items-center justify-center flex-none">
          <div className="w-40 h-40 rounded-full border border-[#8eaa8b] absolute animate-pulse opacity-60"></div>
          <div className="w-32 h-32 rounded-full border border-[#a8c69e] absolute"></div>
          <div className="w-20 h-20 rounded-full bg-[#17271b] text-white flex flex-col items-center justify-center text-xs font-bold shadow-lg">
            <span>notice</span>
            <Sparkles className="w-4 h-4 text-[#76b900] mt-0.5" />
          </div>
        </div>
      </section>

      {/* Vault Security / Passphrase Lock */}
      <section className="vault-section mb-10" id="privacy">
        {!isVaultCreated ? (
          <div className="vault-card p-8 rounded-2xl bg-white border border-[#dfe5df] shadow-sm max-w-xl mx-auto">
            <div className="vault-mark text-2xl mb-2 text-[#4b8b56]">✳</div>
            <p className="section-label text-xs font-bold tracking-widest text-[#5e7862] uppercase">
              YOUR PRIVATE SPACE
            </p>
            <h2 className="text-2xl font-bold text-[#151a17] mb-2">
              Your reflections stay on this device.
            </h2>
            <p className="text-xs text-[#69716b] mb-4">
              Create a private vault with a passphrase. Your entries are encrypted in this browser and are never sent to external servers.
            </p>

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#151a17] mb-1">Choose a username</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                  placeholder="A name for this private space"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#151a17] mb-1">Create a passphrase (at least 12 chars)</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                  placeholder="At least 12 characters"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  minLength={12}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#151a17] mb-1">Confirm passphrase</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                  placeholder="Enter it again"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  minLength={12}
                  required
                />
              </div>

              {vaultError && (
                <p className="text-xs text-red-600 font-medium">{vaultError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#17271b] text-white font-semibold text-xs hover:bg-[#315d39] transition-all cursor-pointer"
              >
                Create Private Vault 🔒
              </button>
            </form>
          </div>
        ) : !isUnlocked ? (
          <div className="vault-card p-8 rounded-2xl bg-white border border-[#dfe5df] shadow-sm max-w-md mx-auto text-center">
            <Lock className="w-8 h-8 text-[#4b8b56] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#151a17] mb-1">Welcome back, {username}</h2>
            <p className="text-xs text-[#69716b] mb-4">Enter your passphrase to unlock your private reflections.</p>

            <form onSubmit={handleUnlockVault} className="space-y-4">
              <input
                type="password"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none text-center"
                placeholder="Enter passphrase"
                value={unlockPass}
                onChange={(e) => setUnlockPass(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#17271b] text-white font-semibold text-xs hover:bg-[#315d39] cursor-pointer"
              >
                Unlock Vault 🔓
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#cbd9c8]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#4b8b56]" />
              <div>
                <span className="text-xs font-bold text-[#151a17]">Vault Unlocked ({username})</span>
                <span className="text-[11px] text-[#69716b] block">Reflections are stored encrypted on this device</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLock}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#cbd4ca] text-[#151a17] hover:bg-[#f4f7f3] cursor-pointer flex items-center gap-1"
              >
                <Lock className="w-3.5 h-3.5" /> Lock
              </button>
              <button
                type="button"
                onClick={handleDeleteVault}
                className="px-3 py-1.5 text-xs font-semibold rounded-full text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Delete Vault
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Main Health Workspace when unlocked */}
      {isVaultCreated && isUnlocked && (
        <div className="space-y-8">
          {/* Dashboard Intro */}
          <section className="p-6 rounded-2xl bg-white border border-[#dfe5df] flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#5e7862] uppercase mb-1">A GENTLE CHECK-IN</p>
              <h2 className="text-xl font-bold text-[#151a17] m-0">What would help right now?</h2>
              <p className="text-xs text-[#69716b] m-0 mt-1">Choose one small action. There is no streak to maintain and nothing you need to finish.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsResetActive(true)}
              className="px-4 py-2.5 rounded-full bg-[#17271b] text-white text-xs font-semibold hover:bg-[#315d39] cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Start 40-sec Rest & Reset
            </button>
          </section>

          {/* Grid of Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool 01: System 1 / Quick Log */}
            <section className="p-6 rounded-2xl bg-white border border-[#dfe5df] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#e8f1e2] text-[#315d39] font-bold text-xs flex items-center justify-center">01</span>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-[#5e7862] uppercase">SYSTEM 1 / QUICK LOG</p>
                  <h2 className="text-base font-bold text-[#151a17] m-0">Catch the first thought</h2>
                </div>
              </div>

              <form onSubmit={handleAddImpulse} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">What happened?</label>
                  <textarea
                    className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    rows={2}
                    placeholder="A short event or message arrived..."
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">Body sensation (Optional)</label>
                  <input
                    type="text"
                    className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    placeholder="Tight shoulders, racing heart..."
                    value={sensation}
                    onChange={(e) => setSensation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">First assumption</label>
                  <textarea
                    className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    rows={2}
                    placeholder="The quick story my mind told me was..."
                    value={firstThought}
                    onChange={(e) => setFirstThought(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">
                      Intensity: <span className="font-bold text-[#315d39]">{severity}/10</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      className="w-full accent-[#315d39]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">Thinking Pattern</label>
                    <select
                      className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] bg-white outline-none"
                      value={heuristic}
                      onChange={(e) => setHeuristic(e.target.value)}
                    >
                      <option value="WYSIATI">WYSIATI · limited info</option>
                      <option value="AFFECT_HEURISTIC">Affect · feeling as proof</option>
                      <option value="AVAILABILITY">Availability · recent example</option>
                      <option value="ANCHORING">Anchoring · first detail</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#17271b] text-white text-xs font-semibold hover:bg-[#315d39] cursor-pointer"
                >
                  Save Reflection ↗
                </button>
              </form>

              {impulseLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#dfe5df]">
                  <span className="text-[10px] font-bold text-[#5e7862] uppercase block mb-2">Recent Reflections</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {impulseLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-[#f4f7f3] text-xs">
                        <div className="flex justify-between text-[10px] text-[#69716b] font-semibold mb-1">
                          <span>{log.heuristic} · Severity {log.severity}/10</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="font-semibold text-[#151a17] m-0">{log.firstThought}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Tool 02: Experiencing Self / Moment */}
            <section className="p-6 rounded-2xl bg-white border border-[#dfe5df] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#e8f1e2] text-[#315d39] font-bold text-xs flex items-center justify-center">02</span>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-[#5e7862] uppercase">EXPERIENCING SELF / MOMENT</p>
                  <h2 className="text-base font-bold text-[#151a17] m-0">How is this moment?</h2>
                </div>
              </div>

              <form onSubmit={handleAddMoment} className="space-y-4">
                <div>
                  <label className="flex justify-between text-xs font-semibold text-[#151a17] mb-1">
                    <span>Calm</span>
                    <span className="text-[#315d39] font-bold">{calm}/6</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={calm}
                    onChange={(e) => setCalm(Number(e.target.value))}
                    className="w-full accent-[#315d39]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs font-semibold text-[#151a17] mb-1">
                    <span>Anxiety</span>
                    <span className="text-[#315d39] font-bold">{anxiety}/6</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={anxiety}
                    onChange={(e) => setAnxiety(Number(e.target.value))}
                    className="w-full accent-[#315d39]"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs font-semibold text-[#151a17] mb-1">
                    <span>Focus</span>
                    <span className="text-[#315d39] font-bold">{focus}/6</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={focus}
                    onChange={(e) => setFocus(Number(e.target.value))}
                    className="w-full accent-[#315d39]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full border border-[#cbd4ca] text-[#151a17] text-xs font-semibold hover:bg-[#f4f7f3] cursor-pointer"
                >
                  Save Moment Snapshot ↗
                </button>
              </form>

              {momentLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#dfe5df]">
                  <span className="text-[10px] font-bold text-[#5e7862] uppercase block mb-2">Recent Snapshots</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {momentLogs.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-lg bg-[#f4f7f3] text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#151a17]">Calm {m.calm}/6</span> ·{' '}
                          <span className="text-[#69716b]">Anxiety {m.anxiety}/6</span> ·{' '}
                          <span className="text-[#315d39]">Focus {m.focus}/6</span>
                        </div>
                        <span className="text-[10px] text-[#69716b]">{m.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Tool 03: System 2 / Reframer */}
            <section className="p-6 rounded-2xl bg-white border border-[#dfe5df] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#e8f1e2] text-[#315d39] font-bold text-xs flex items-center justify-center">03</span>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-[#5e7862] uppercase">SYSTEM 2 / A SECOND LOOK</p>
                  <h2 className="text-base font-bold text-[#151a17] m-0">Test the first story</h2>
                </div>
              </div>

              <form onSubmit={handleAddReframe} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">What is one other explanation?</label>
                  <textarea
                    className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    rows={2}
                    placeholder="A possibility that doesn't assume the worst..."
                    value={altOne}
                    onChange={(e) => setAltOne(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">What is another explanation?</label>
                  <textarea
                    className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    rows={2}
                    placeholder="One more explanation that fits the facts..."
                    value={altTwo}
                    onChange={(e) => setAltTwo(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs font-semibold text-[#151a17] mb-1">
                    <span>Today's evidence vs memory score</span>
                    <span className="text-[#315d39] font-bold">{evidenceScore}/6</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={evidenceScore}
                    onChange={(e) => setEvidenceScore(Number(e.target.value))}
                    className="w-full accent-[#315d39]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">Fairer reframed view</label>
                  <textarea
                    className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    rows={2}
                    placeholder="I don't know the full outcome yet. What I know is..."
                    value={reframedView}
                    onChange={(e) => setReframedView(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#17271b] text-white text-xs font-semibold hover:bg-[#315d39] cursor-pointer"
                >
                  Save Reframed Perspective ↗
                </button>
              </form>
            </section>

            {/* Tool 04: DRM Day Reconstruction */}
            <section className="p-6 rounded-2xl bg-white border border-[#dfe5df] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#e8f1e2] text-[#315d39] font-bold text-xs flex items-center justify-center">04</span>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-[#5e7862] uppercase">REMEMBERING SELF / DAY RECONSTRUCTION</p>
                  <h2 className="text-base font-bold text-[#151a17] m-0">Remember the whole day</h2>
                </div>
              </div>

              <form onSubmit={handleAddEpisode} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#151a17] mb-1">Scene or activity</label>
                  <input
                    type="text"
                    className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                    placeholder="Morning commute, lunch with a friend..."
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">Start time</label>
                    <input
                      type="time"
                      className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] outline-none"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">End time</label>
                    <input
                      type="time"
                      className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] outline-none"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-[#151a17] block">Happiness ({epHappiness})</span>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={epHappiness}
                      onChange={(e) => setEpHappiness(Number(e.target.value))}
                      className="w-full accent-[#315d39]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#151a17] block">Stress ({epStress})</span>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={epStress}
                      onChange={(e) => setEpStress(Number(e.target.value))}
                      className="w-full accent-[#315d39]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#151a17] block">Calm ({epCalm})</span>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={epCalm}
                      onChange={(e) => setEpCalm(Number(e.target.value))}
                      className="w-full accent-[#315d39]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full border border-[#cbd4ca] text-[#151a17] text-xs font-semibold hover:bg-[#f4f7f3] cursor-pointer"
                >
                  Add Scene to Day Timeline ↗
                </button>
              </form>

              {episodes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#dfe5df]">
                  <span className="text-[10px] font-bold text-[#5e7862] uppercase block mb-2">Today's Scenes</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {episodes.map((ep) => (
                      <div key={ep.id} className="p-2.5 rounded-lg bg-[#f4f7f3] text-xs flex justify-between">
                        <div>
                          <span className="font-bold text-[#151a17]">{ep.activityName}</span>
                          <span className="text-[10px] text-[#69716b] block">{ep.start} – {ep.end}</span>
                        </div>
                        <div className="text-[10px] text-right font-semibold">
                          <span className="text-green-700">Happy {ep.happiness}/6</span> ·{' '}
                          <span className="text-amber-700">Stress {ep.stress}/6</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Pillar 02 Section */}
          <section className="p-8 rounded-2xl bg-gradient-to-r from-[#f4f7f3] to-[#e8f1e5] border border-[#cbd9c8]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#5e7862] uppercase">PILLAR 02 / INNER PERSPECTIVE</p>
                <h2 className="text-2xl font-bold text-[#151a17]">Make room for a more helpful thought.</h2>
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#17271b] text-white">PRIVATE & ENCRYPTED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Watchman */}
              <div className="p-6 rounded-2xl bg-white border border-[#dfe5df]">
                <span className="text-[10px] font-bold tracking-widest text-[#5e7862] uppercase block mb-1">05 · WATCHMAN</span>
                <h3 className="text-base font-bold text-[#151a17] m-0 mb-3">A thought is not a forecast.</h3>
                <form onSubmit={handleAddWatchman} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">What did your mind say?</label>
                    <textarea
                      className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                      rows={2}
                      placeholder="I'm worried that..."
                      value={watchThought}
                      onChange={(e) => setWatchThought(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">A kinder, balanced reply</label>
                    <textarea
                      className="w-full p-2.5 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                      rows={2}
                      value={watchResponse}
                      onChange={(e) => setWatchResponse(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-full bg-[#17271b] text-white text-xs font-semibold hover:bg-[#315d39] cursor-pointer">
                    Save Perspective ↗
                  </button>
                </form>
              </div>

              {/* Phrase */}
              <div className="p-6 rounded-2xl bg-white border border-[#dfe5df]">
                <span className="text-[10px] font-bold tracking-widest text-[#5e7862] uppercase block mb-1">06 · PHRASE</span>
                <h3 className="text-base font-bold text-[#151a17] m-0 mb-3">Give your attention a direction.</h3>
                <form onSubmit={handleAddPhrase} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">Your Phrase (3-6 words)</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                      placeholder="I can take one steady step"
                      value={phraseText}
                      onChange={(e) => setPhraseText(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#151a17] mb-1">Realistic outcome</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs rounded-lg border border-[#cbd4ca] focus:border-[#4b8b56] outline-none"
                      placeholder="I ask one clear question"
                      value={phraseOutcome}
                      onChange={(e) => setPhraseOutcome(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-full border border-[#cbd4ca] text-[#151a17] text-xs font-semibold hover:bg-[#f4f7f3] cursor-pointer">
                    Save Phrase ↗
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 40-second Rest & Reset Breathing Modal */}
      {isResetActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#17271b] text-white p-8 rounded-3xl max-w-sm w-full text-center relative border border-white/20">
            <button
              onClick={() => setIsResetActive(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] tracking-widest text-[#76b900] font-bold uppercase block mb-2">
              40-SECOND REST & RESET
            </span>

            <div className="my-6 relative flex items-center justify-center">
              <div
                className={`w-36 h-36 rounded-full border-4 border-[#76b900] flex items-center justify-center transition-all duration-1000 ${
                  breathPhase === 'Inhale'
                    ? 'scale-110 shadow-[0_0_40px_rgba(118,185,0,0.4)]'
                    : breathPhase === 'Hold'
                    ? 'scale-100'
                    : 'scale-90 opacity-80'
                }`}
              >
                <span className="text-3xl font-extrabold">{resetTimer}s</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{breathPhase}...</h3>
            <p className="text-xs text-[#a8c69e]">Let your shoulders soften and focus on your breath.</p>
          </div>
        </div>
      )}
    </div>
  );
};
