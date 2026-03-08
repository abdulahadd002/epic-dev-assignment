import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RefreshCw, ChevronDown, Loader2, Trash2 } from 'lucide-react';

function clean(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '');
}

function useSpotlight() {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
  }, []);
  return { ref, onMouseMove: onMove };
}

function RegenInput({ componentId, label, onSubmit, onCancel, isLoading }) {
  const [requirements, setRequirements] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 p-4 rounded-xl bg-info/5 border border-info/20 space-y-3 overflow-hidden"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-accent-cyan">
        <span>Regenerate {label}:</span>
        <span className="badge bg-accent-cyan/15 text-accent-cyan">{componentId}</span>
      </div>
      <textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder={`Describe what you'd like changed for ${componentId}...`}
        className="input-dark w-full resize-vertical min-h-[60px] text-sm"
        disabled={isLoading}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(requirements)}
          disabled={isLoading}
          className="btn-accent text-xs py-2 px-4"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Regenerating...</span>
          ) : 'Submit'}
        </button>
        <button onClick={onCancel} disabled={isLoading} className="btn-ghost text-xs py-2 px-4">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export default function Step2_EpicApproval() {
  const {
    generatedEpics, approveEpic, approveStory, approveAC, approveTestCase,
    cancelEpic, regenerateEpic, regenerateStory, regenerateAC, regenerateTestCase,
    setApprovedEpics, nextStep, previousStep
  } = useWorkflow();

  const [expandedEpics, setExpandedEpics] = useState({});
  const [regenerating, setRegenerating] = useState({});
  const [regenOpen, setRegenOpen] = useState({});

  useEffect(() => {
    if (generatedEpics.length > 0) {
      const epicIds = new Set(generatedEpics.map(e => e.epic_id));
      const hasNewEpics = generatedEpics.some(e => !(e.epic_id in expandedEpics));
      const hasStaleKeys = Object.keys(expandedEpics).some(id => !epicIds.has(id));
      if (hasNewEpics || hasStaleKeys || Object.keys(expandedEpics).length === 0) {
        const initial = {};
        generatedEpics.forEach((epic, i) => {
          initial[epic.epic_id] = expandedEpics[epic.epic_id] ?? (i === 0);
        });
        setExpandedEpics(initial);
      }
    }
  }, [generatedEpics]);

  const toggleEpic = (epicId) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const approvedCount = generatedEpics.filter(e => e.approved).length;
  const totalStories = generatedEpics.reduce(
    (sum, e) => sum + (e.user_stories?.filter(s => s.approved).length || 0), 0
  );

  const openRegenInput = (key) => setRegenOpen(prev => ({ ...prev, [key]: true }));
  const closeRegenInput = (key) => setRegenOpen(prev => ({ ...prev, [key]: false }));

  const handleRegenerate = async (key, fn, requirements) => {
    setRegenerating(prev => ({ ...prev, [key]: true }));
    try {
      const result = await fn(requirements);
      if (!result?.success) {
        alert('Regeneration failed: ' + (result?.error || 'Unknown error'));
      } else {
        closeRegenInput(key);
      }
    } catch (error) {
      alert('Regeneration error: ' + error.message);
    } finally {
      setRegenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleProceed = async () => {
    const approved = generatedEpics.filter(e => e.approved ||
      e.user_stories?.some(s => s.approved)
    ).map(epic => ({
      ...epic,
      user_stories: epic.user_stories?.filter(s => s.approved) || []
    }));
    if (approved.length === 0) {
      alert('Please approve at least one epic or user story before proceeding');
      return;
    }
    setApprovedEpics(approved);
    nextStep();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white">Review & Approve Epics</h2>
          <p className="text-white/40 text-sm mt-1">
            Review generated epics and approve the ones you want to include
          </p>
        </div>
        <div className="stat-card text-right">
          <div className="stat-label">Approved</div>
          <div className="text-lg font-bold text-accent-cyan">
            {approvedCount} <span className="text-xs text-white/30 font-normal">epics</span>
            {' '}{totalStories} <span className="text-xs text-white/30 font-normal">stories</span>
          </div>
        </div>
      </div>

      {/* Epic List */}
      <div className="space-y-3">
        {generatedEpics.map((epic, eIndex) => (
          <EpicCard
            key={epic.epic_id}
            epic={epic}
            eIndex={eIndex}
            expanded={expandedEpics[epic.epic_id]}
            onToggle={() => toggleEpic(epic.epic_id)}
            regenerating={regenerating}
            regenOpen={regenOpen}
            openRegenInput={openRegenInput}
            closeRegenInput={closeRegenInput}
            handleRegenerate={handleRegenerate}
            approveEpic={approveEpic}
            approveStory={approveStory}
            approveAC={approveAC}
            approveTestCase={approveTestCase}
            cancelEpic={cancelEpic}
            regenerateEpic={regenerateEpic}
            regenerateStory={regenerateStory}
            regenerateAC={regenerateAC}
            regenerateTestCase={regenerateTestCase}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={previousStep} className="btn-ghost text-sm">Back</button>
        <motion.button
          onClick={handleProceed}
          disabled={approvedCount === 0 && totalStories === 0}
          className="btn-accent flex-1 text-sm"
          whileTap={{ scale: 0.98 }}
        >
          Proceed to Developer Analysis
        </motion.button>
      </div>
    </div>
  );
}

function EpicCard({
  epic, eIndex, expanded, onToggle,
  regenerating, regenOpen, openRegenInput, closeRegenInput, handleRegenerate,
  approveEpic, approveStory, approveAC, approveTestCase,
  cancelEpic, regenerateEpic, regenerateStory, regenerateAC, regenerateTestCase
}) {
  const spotlight = useSpotlight();

  return (
    <motion.div
      layout
      ref={spotlight.ref}
      onMouseMove={spotlight.onMouseMove}
      className={`spotlight-card overflow-hidden transition-all duration-300
        ${epic.approved ? 'border-success/30 bg-success/[0.02]' : ''}`}
    >
      {/* Epic Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="badge bg-accent-cyan/15 text-accent-cyan shrink-0">{epic.epic_id}</span>
          {epic.approved && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="badge bg-success/15 text-success shrink-0"
            >
              <Check className="w-3 h-3 mr-0.5" /> Approved
            </motion.span>
          )}
          <span className="font-medium text-white truncate">{clean(epic.epic_title)}</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </div>

      {/* Epic Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/[0.04] space-y-4 pt-4">
              <p className="text-sm text-white/50">{clean(epic.epic_description)}</p>

              {/* User Stories */}
              {epic.user_stories?.map((story, sIndex) => (
                <div
                  key={story.story_id}
                  className={`ml-3 pl-4 border-l-2 space-y-3 transition-colors duration-300
                    ${story.approved ? 'border-success/40' : 'border-white/[0.06]'}`}
                >
                  {/* Story header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="badge bg-purple/15 text-purple">{story.story_id}</span>
                      {story.story_points && (
                        <span className="badge bg-warning/15 text-warning">{story.story_points} pts</span>
                      )}
                      {story.approved && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="badge bg-success/15 text-success">
                          Approved
                        </motion.span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-white/85">{clean(story.story_title)}</div>
                    <div className="text-sm text-white/45 mt-1">{clean(story.story_description)}</div>
                  </div>

                  {/* Acceptance Criteria */}
                  {story.acceptance_criteria && (
                    <div className={`p-3.5 rounded-xl text-sm relative transition-all duration-300
                      ${story.ac_approved ? 'bg-success/[0.05] border border-success/10' : 'bg-white/[0.02] border border-white/[0.04]'}
                      ${regenerating[`ac-${story.story_id}`] ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {regenerating[`ac-${story.story_id}`] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/70 rounded-xl z-10">
                          <span className="text-sm font-medium text-accent-cyan flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Regenerating...
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-white/30">Acceptance Criteria</span>
                        <div className="flex gap-2">
                          {!regenOpen[`ac-${story.story_id}`] && (
                            <button onClick={() => openRegenInput(`ac-${story.story_id}`)} className="btn-subtle text-xs py-1 px-3">
                              <RefreshCw className="w-3 h-3 inline mr-1" />Regen
                            </button>
                          )}
                          {!story.ac_approved && (
                            <button onClick={() => approveAC(eIndex, sIndex)} className="btn-subtle text-xs py-1 px-3 bg-success/10 text-success hover:bg-success/20">
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-white/55 whitespace-pre-wrap text-[13px] leading-relaxed">
                        {clean(story.acceptance_criteria)}
                      </div>
                      <AnimatePresence>
                        {regenOpen[`ac-${story.story_id}`] && (
                          <RegenInput
                            componentId={story.story_id}
                            label="Acceptance Criteria"
                            isLoading={regenerating[`ac-${story.story_id}`]}
                            onCancel={() => closeRegenInput(`ac-${story.story_id}`)}
                            onSubmit={(reqs) => handleRegenerate(
                              `ac-${story.story_id}`, (r) => regenerateAC(eIndex, sIndex, r), reqs
                            )}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Test Cases */}
                  {story.test_cases?.map((tc, tcIndex) => (
                    <div
                      key={tc.test_case_id}
                      className={`p-3.5 rounded-xl text-sm relative transition-all duration-300
                        ${tc.approved ? 'bg-success/[0.05] border border-success/10' : 'bg-white/[0.02] border border-white/[0.04]'}
                        ${regenerating[`tc-${tc.test_case_id}`] ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {regenerating[`tc-${tc.test_case_id}`] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/70 rounded-xl z-10">
                          <span className="text-sm font-medium text-accent-cyan flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Regenerating...
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge bg-white/[0.06] text-white/50">{tc.test_case_id}</span>
                        <div className="flex gap-2">
                          {!regenOpen[`tc-${tc.test_case_id}`] && (
                            <button onClick={() => openRegenInput(`tc-${tc.test_case_id}`)} className="btn-subtle text-xs py-1 px-3">
                              <RefreshCw className="w-3 h-3 inline mr-1" />Regen
                            </button>
                          )}
                          {!tc.approved && (
                            <button onClick={() => approveTestCase(eIndex, sIndex, tcIndex)} className="btn-subtle text-xs py-1 px-3 bg-success/10 text-success hover:bg-success/20">
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-white/55 text-[13px]">{clean(tc.test_case_description)}</div>

                      {/* Input section */}
                      {(tc.input_preconditions || tc.input_test_data || tc.input_user_action) && (
                        <div className="mt-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-white/25 mb-1.5">Input</div>
                          {tc.input_preconditions && (
                            <div className="text-[13px]">
                              <span className="text-accent-cyan/60 font-medium">Preconditions: </span>
                              <span className="text-white/45">{clean(tc.input_preconditions)}</span>
                            </div>
                          )}
                          {tc.input_test_data && (
                            <div className="text-[13px]">
                              <span className="text-accent-cyan/60 font-medium">Test Data: </span>
                              <span className="text-white/45">{clean(tc.input_test_data)}</span>
                            </div>
                          )}
                          {tc.input_user_action && (
                            <div className="text-[13px]">
                              <span className="text-accent-cyan/60 font-medium">User Action: </span>
                              <span className="text-white/45">{clean(tc.input_user_action)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {tc.expected_results?.length > 0 && (
                        <div className="mt-2.5">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-white/25 mb-1.5">Expected Result</div>
                          <ul className="ml-4 space-y-1 text-white/45 text-[13px] list-disc">
                            {tc.expected_results.map((result, i) => (
                              <li key={i}>{clean(result)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <AnimatePresence>
                        {regenOpen[`tc-${tc.test_case_id}`] && (
                          <RegenInput
                            componentId={tc.test_case_id}
                            label="Test Case"
                            isLoading={regenerating[`tc-${tc.test_case_id}`]}
                            onCancel={() => closeRegenInput(`tc-${tc.test_case_id}`)}
                            onSubmit={(reqs) => handleRegenerate(
                              `tc-${tc.test_case_id}`, (r) => regenerateTestCase(eIndex, sIndex, tcIndex, r), reqs
                            )}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Story Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <motion.button
                      onClick={() => approveStory(eIndex, sIndex)}
                      disabled={story.approved}
                      className={`text-xs py-2 px-4 rounded-lg font-medium transition-all duration-200
                        ${story.approved
                          ? 'bg-success/10 text-success/60 cursor-default'
                          : 'bg-success/15 text-success hover:bg-success/25 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)] cursor-pointer'}`}
                      whileTap={!story.approved ? { scale: 0.95 } : {}}
                    >
                      {story.approved ? <><Check className="w-3 h-3 inline mr-1" />Story Approved</> : 'Approve Story'}
                    </motion.button>
                    {!regenOpen[`story-${story.story_id}`] && (
                      <button onClick={() => openRegenInput(`story-${story.story_id}`)} className="btn-subtle text-xs py-2 px-4">
                        <RefreshCw className="w-3 h-3 inline mr-1" />Regenerate Story
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {regenOpen[`story-${story.story_id}`] && (
                      <RegenInput
                        componentId={story.story_id}
                        label="User Story"
                        isLoading={regenerating[`story-${story.story_id}`]}
                        onCancel={() => closeRegenInput(`story-${story.story_id}`)}
                        onSubmit={(reqs) => handleRegenerate(
                          `story-${story.story_id}`, (r) => regenerateStory(eIndex, sIndex, r), reqs
                        )}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Epic Actions */}
              <div className="flex gap-2 pt-3 border-t border-white/[0.04] flex-wrap">
                <motion.button
                  onClick={() => approveEpic(eIndex)}
                  disabled={epic.approved}
                  className={`text-sm py-2.5 px-5 rounded-lg font-medium transition-all duration-200
                    ${epic.approved
                      ? 'bg-success/10 text-success/60 cursor-default'
                      : 'bg-success text-black hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer'}`}
                  whileTap={!epic.approved ? { scale: 0.95 } : {}}
                >
                  {epic.approved ? <><Check className="w-4 h-4 inline mr-1" />Epic Approved</> : 'Approve Epic'}
                </motion.button>
                {!regenOpen[`epic-${epic.epic_id}`] && (
                  <button onClick={() => openRegenInput(`epic-${epic.epic_id}`)} className="btn-subtle text-sm py-2.5 px-5">
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Regenerate
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('Remove this epic?')) cancelEpic(eIndex); }}
                  className="text-sm py-2.5 px-5 rounded-lg font-medium text-danger/60 bg-danger/10
                           hover:bg-danger/20 hover:text-danger transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />Remove
                </button>
              </div>
              <AnimatePresence>
                {regenOpen[`epic-${epic.epic_id}`] && (
                  <RegenInput
                    componentId={epic.epic_id}
                    label="Epic"
                    isLoading={regenerating[`epic-${epic.epic_id}`]}
                    onCancel={() => closeRegenInput(`epic-${epic.epic_id}`)}
                    onSubmit={(reqs) => handleRegenerate(
                      `epic-${epic.epic_id}`, (r) => regenerateEpic(eIndex, r), reqs
                    )}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
