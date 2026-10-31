import React from 'react';
import { QuestionPaperBlueprint, DifficultyLevel } from '../types';
import { Settings2, Brain, Sliders, ListOrdered, Plus, Trash2 } from 'lucide-react';

interface Step5Props {
  blueprint: QuestionPaperBlueprint;
  onChange: (updates: Partial<QuestionPaperBlueprint>) => void;
}

export const Step5Settings: React.FC<Step5Props> = ({ blueprint, onChange }) => {
  const instructions = blueprint.generalInstructions || [
    'Check whether the question paper contains all printed pages and questions.',
    'Answer all questions in Section A. Read choices carefully in other sections.',
    'Write neatly and legibly. Use of standard non-programmable calculators is allowed where specified.',
  ];

  function addInstruction() {
    onChange({
      generalInstructions: [...instructions, ''],
    });
  }

  function updateInstruction(idx: number, text: string) {
    const updated = [...instructions];
    updated[idx] = text;
    onChange({ generalInstructions: updated });
  }

  function removeInstruction(idx: number) {
    const updated = instructions.filter((_, i) => i !== idx);
    onChange({ generalInstructions: updated });
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="border-b border-[#EFEBE9] pb-4">
        <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#6D4C41]" />
          Step 5: Cognitive Rigor & Examination Settings
        </h2>
        <p className="text-xs text-[#6D4C41] mt-1">
          Tune the pedagogical complexity, Bloom's Taxonomy cognitive distribution, and candidate instructions.
        </p>
      </div>

      {/* Difficulty Level Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#4E342E] uppercase tracking-wider">
          Examination Difficulty Level <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['EASY', 'MEDIUM', 'HARD', 'BALANCED'] as DifficultyLevel[]).map((lvl) => {
            const isSelected = blueprint.difficulty === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onChange({ difficulty: lvl })}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#3E2723] border-[#3E2723] text-white shadow-md'
                    : 'bg-white border-[#D7CCC8] text-[#4E342E] hover:border-[#6D4C41]'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">{lvl}</div>
                <div className={`text-[10px] mt-1 ${isSelected ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'}`}>
                  {lvl === 'EASY' && 'Foundational, direct recall questions'}
                  {lvl === 'MEDIUM' && 'Conceptual clarity and standard problems'}
                  {lvl === 'HARD' && 'Advanced analytical & application-heavy'}
                  {lvl === 'BALANCED' && '30% Recall, 40% Conceptual, 30% Analytical'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specific Learning Outcomes / Focus Instructions for AI */}
      <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-2">
        <label className="block text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#6D4C41]" />
          Specific Focus Areas & Learning Outcomes <span className="text-xs font-normal text-[#8D6E63]">(Optional)</span>
        </label>
        <textarea
          rows={3}
          value={blueprint.learningOutcomes || ''}
          onChange={(e) => onChange({ learningOutcomes: e.target.value })}
          placeholder="e.g. Focus heavily on Newton's Laws derivations in Section B, and numerical problems on velocity in Section C..."
          className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl p-3 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]/30 font-medium"
        />
      </div>

      {/* Candidate Instructions */}
      <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#4E342E] uppercase tracking-wider flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#6D4C41]" />
            General Instructions for Candidates
          </label>
          <button
            type="button"
            onClick={addInstruction}
            className="flex items-center gap-1 text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>

        <div className="space-y-2">
          {instructions.map((inst, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F7F2EF] text-[#6D4C41] text-[10px] font-bold flex items-center justify-center shrink-0 border border-[#D7CCC8]">
                {idx + 1}
              </span>
              <input
                type="text"
                value={inst}
                onChange={(e) => updateInstruction(idx, e.target.value)}
                placeholder="Enter candidate instruction..."
                className="flex-1 bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]/30"
              />
              {instructions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstruction(idx)}
                  className="text-[#8D6E63] hover:text-rose-600 p-1 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

