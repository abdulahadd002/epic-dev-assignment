import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

function RegenInput({ componentId, label, onSubmit, onCancel, isLoading }) {
  const [requirements, setRequirements] = useState('');

  return (
    <div className="mt-3 p-3 border-2 border-blue-400 dark:border-blue-600 rounded-lg
                    bg-blue-50 dark:bg-blue-900/20 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
        <span>🔄</span>
        <span>Regenerate {label}:</span>
        <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200
                       rounded text-xs font-bold">{componentId}</span>
      </div>
      <textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder={`Describe what you'd like changed for ${componentId}... (e.g., "Make it more specific to mobile platforms" or "Focus on security testing")`}
        className="w-full p-2 text-sm border border-blue-300 dark:border-blue-600 rounded
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                 placeholder-gray-400 dark:placeholder-gray-500 resize-vertical min-h-[60px]
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(requirements)}
          disabled={isLoading}
          className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700
                   disabled:bg-gray-400 text-white rounded transition-colors"
        >
          {isLoading ? '⏳ Regenerating...' : '🔄 Submit'}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-1.5 text-xs font-medium bg-gray-500 hover:bg-gray-600
                   disabled:bg-gray-400 text-white rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Step2_EpicApproval() {
  const {
    generatedEpics,
    approveEpic,
    approveStory,
    approveAC,
    approveTestCase,
    cancelEpic,
    regenerateEpic,
    regenerateStory,
    regenerateAC,
    regenerateTestCase,
    setApprovedEpics,
    nextStep,
    previousStep
  } = useWorkflow();

  const [expandedEpics, setExpandedEpics] = useState([]);
  const [regenerating, setRegenerating] = useState({});
  const [regenOpen, setRegenOpen] = useState({});

  // Initialize expanded state when epics are loaded
  useEffect(() => {
    if (generatedEpics.length > 0 && expandedEpics.length === 0) {
      setExpandedEpics(generatedEpics.map((_, i) => i === 0));
    }
  }, [generatedEpics]);

  const toggleEpic = (index) => {
    setExpandedEpics(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  const approvedCount = generatedEpics.filter(e => e.approved).length;
  const totalStories = generatedEpics.reduce(
    (sum, e) => sum + (e.user_stories?.filter(s => s.approved).length || 0), 0
  );

  const openRegenInput = (key) => {
    setRegenOpen(prev => ({ ...prev, [key]: true }));
  };

  const closeRegenInput = (key) => {
    setRegenOpen(prev => ({ ...prev, [key]: false }));
  };

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
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Review & Approve Epics
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Review generated epics and approve the ones you want to include
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Approved: <span className="font-bold text-blue-600 dark:text-blue-400">
                {approvedCount} epics, {totalStories} stories
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {generatedEpics.map((epic, eIndex) => (
            <div
              key={epic.epic_id}
              className={`border rounded-lg overflow-hidden transition-all
                ${epic.approved ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                  'border-gray-300 dark:border-gray-600'}`}
            >
              {/* Epic Header */}
              <div
                onClick={() => toggleEpic(eIndex)}
                className="flex items-center justify-between p-4 cursor-pointer
                         hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900
                                   text-blue-700 dark:text-blue-300 rounded">
                      {epic.epic_id}
                    </span>
                    {epic.approved && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900
                                     text-green-700 dark:text-green-300 rounded">
                        ✓ Approved
                      </span>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {epic.epic_title}
                    </span>
                  </div>
                </div>
                <span className="text-xl">{expandedEpics[eIndex] ? '▼' : '▶'}</span>
              </div>

              {/* Epic Content */}
              {expandedEpics[eIndex] && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Description:</strong> {epic.epic_description}
                  </div>

                  {/* User Stories */}
                  {epic.user_stories?.map((story, sIndex) => (
                    <div
                      key={story.story_id}
                      className={`ml-4 border-l-4 pl-4 space-y-3
                        ${story.approved ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span>👤</span>
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900
                                           text-purple-700 dark:text-purple-300 rounded">
                              {story.story_id}
                            </span>
                            {story.story_points && (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900
                                             text-yellow-700 dark:text-yellow-300 rounded">
                                {story.story_points} pts
                              </span>
                            )}
                            {story.approved && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900
                                             text-green-700 dark:text-green-300 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {story.story_title}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {story.story_description}
                          </div>
                        </div>
                      </div>

                      {/* Acceptance Criteria */}
                      {story.acceptance_criteria && (
                        <div className={`p-3 rounded-lg text-sm relative
                          ${story.ac_approved ? 'bg-green-50 dark:bg-green-900/20' :
                            'bg-gray-50 dark:bg-gray-700'}
                          ${regenerating[`ac-${eIndex}-${sIndex}`] ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {regenerating[`ac-${eIndex}-${sIndex}`] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 rounded-lg z-10">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Regenerating...</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <strong className="text-gray-700 dark:text-gray-300">
                              ✅ Acceptance Criteria
                            </strong>
                            <div className="flex gap-2">
                              {!regenOpen[`ac-${eIndex}-${sIndex}`] && (
                                <button
                                  onClick={() => openRegenInput(`ac-${eIndex}-${sIndex}`)}
                                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700
                                           text-white rounded transition-colors"
                                >
                                  🔄 Regenerate
                                </button>
                              )}
                              {!story.ac_approved && (
                                <button
                                  onClick={() => approveAC(eIndex, sIndex)}
                                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700
                                           text-white rounded transition-colors"
                                >
                                  ✓ Approve
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {story.acceptance_criteria}
                          </div>
                          {regenOpen[`ac-${eIndex}-${sIndex}`] && (
                            <RegenInput
                              componentId={story.story_id}
                              label="Acceptance Criteria"
                              isLoading={regenerating[`ac-${eIndex}-${sIndex}`]}
                              onCancel={() => closeRegenInput(`ac-${eIndex}-${sIndex}`)}
                              onSubmit={(reqs) => handleRegenerate(
                                `ac-${eIndex}-${sIndex}`,
                                (r) => regenerateAC(eIndex, sIndex, r),
                                reqs
                              )}
                            />
                          )}
                        </div>
                      )}

                      {/* Test Cases */}
                      {story.test_cases?.map((tc, tcIndex) => (
                        <div
                          key={tc.test_case_id}
                          className={`p-3 rounded-lg text-sm relative
                            ${tc.approved ? 'bg-green-50 dark:bg-green-900/20' :
                              'bg-gray-50 dark:bg-gray-700'}
                            ${regenerating[`tc-${eIndex}-${sIndex}-${tcIndex}`] ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {regenerating[`tc-${eIndex}-${sIndex}-${tcIndex}`] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 rounded-lg z-10">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Regenerating...</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span>🧪</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {tc.test_case_id}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {!regenOpen[`tc-${eIndex}-${sIndex}-${tcIndex}`] && (
                                <button
                                  onClick={() => openRegenInput(`tc-${eIndex}-${sIndex}-${tcIndex}`)}
                                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700
                                           text-white rounded transition-colors"
                                >
                                  🔄 Regenerate
                                </button>
                              )}
                              {!tc.approved && (
                                <button
                                  onClick={() => approveTestCase(eIndex, sIndex, tcIndex)}
                                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700
                                           text-white rounded transition-colors"
                                >
                                  ✓ Approve
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-600 dark:text-gray-300">
                            {tc.test_case_description}
                          </div>
                          {tc.expected_results && (
                            <ul className="mt-2 ml-4 list-disc text-gray-600 dark:text-gray-300">
                              {tc.expected_results.map((result, i) => (
                                <li key={i}>{result}</li>
                              ))}
                            </ul>
                          )}
                          {regenOpen[`tc-${eIndex}-${sIndex}-${tcIndex}`] && (
                            <RegenInput
                              componentId={tc.test_case_id}
                              label="Test Case"
                              isLoading={regenerating[`tc-${eIndex}-${sIndex}-${tcIndex}`]}
                              onCancel={() => closeRegenInput(`tc-${eIndex}-${sIndex}-${tcIndex}`)}
                              onSubmit={(reqs) => handleRegenerate(
                                `tc-${eIndex}-${sIndex}-${tcIndex}`,
                                (r) => regenerateTestCase(eIndex, sIndex, tcIndex, r),
                                reqs
                              )}
                            />
                          )}
                        </div>
                      ))}

                      {/* Story Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => approveStory(eIndex, sIndex)}
                          disabled={story.approved}
                          className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700
                                   disabled:bg-gray-400 text-white rounded transition-colors"
                        >
                          {story.approved ? '✓ Story Approved' : '✓ Approve Story'}
                        </button>
                        {!regenOpen[`story-${eIndex}-${sIndex}`] && (
                          <button
                            onClick={() => openRegenInput(`story-${eIndex}-${sIndex}`)}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                                     text-white rounded transition-colors"
                          >
                            🔄 Regenerate Story
                          </button>
                        )}
                      </div>
                      {regenOpen[`story-${eIndex}-${sIndex}`] && (
                        <RegenInput
                          componentId={story.story_id}
                          label="User Story"
                          isLoading={regenerating[`story-${eIndex}-${sIndex}`]}
                          onCancel={() => closeRegenInput(`story-${eIndex}-${sIndex}`)}
                          onSubmit={(reqs) => handleRegenerate(
                            `story-${eIndex}-${sIndex}`,
                            (r) => regenerateStory(eIndex, sIndex, r),
                            reqs
                          )}
                        />
                      )}
                    </div>
                  ))}

                  {/* Epic Actions */}
                  <div className="flex gap-2 pt-4 flex-wrap">
                    <button
                      onClick={() => approveEpic(eIndex)}
                      disabled={epic.approved}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400
                               text-white font-medium rounded transition-colors"
                    >
                      {epic.approved ? '✓ Epic Approved' : '✓ Approve Epic'}
                    </button>
                    {!regenOpen[`epic-${eIndex}`] && (
                      <button
                        onClick={() => openRegenInput(`epic-${eIndex}`)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700
                                 text-white font-medium rounded transition-colors"
                      >
                        🔄 Regenerate Epic
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Remove this epic?')) {
                          cancelEpic(eIndex);
                        }
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white
                               font-medium rounded transition-colors"
                    >
                      ✕ Remove Epic
                    </button>
                  </div>
                  {regenOpen[`epic-${eIndex}`] && (
                    <RegenInput
                      componentId={epic.epic_id}
                      label="Epic"
                      isLoading={regenerating[`epic-${eIndex}`]}
                      onCancel={() => closeRegenInput(`epic-${eIndex}`)}
                      onSubmit={(reqs) => handleRegenerate(
                        `epic-${eIndex}`,
                        (r) => regenerateEpic(eIndex, r),
                        reqs
                      )}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={previousStep}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                     dark:hover:bg-gray-700 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleProceed}
            disabled={approvedCount === 0 && totalStories === 0}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                     text-white font-medium rounded-lg transition-colors"
          >
            Proceed to Developer Analysis →
          </button>
        </div>
      </div>
    </div>
  );
}
