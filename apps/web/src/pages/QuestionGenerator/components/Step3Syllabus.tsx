import React, { useState } from 'react';
import { QuestionPaperBlueprint, ChapterOrUnit } from '../types';
import { apiFetch } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  FileUp,
} from 'lucide-react';

interface Step3Props {
  blueprint: QuestionPaperBlueprint;
  onChange: (updates: Partial<QuestionPaperBlueprint>) => void;
  preloadedCurricula?: any;
}

export const Step3Syllabus: React.FC<Step3Props> = ({ blueprint, onChange, preloadedCurricula }) => {
  const toast = useToast();
  const [activeMode, setActiveMode] = useState<'PRELOADED' | 'MANUAL' | 'PASTE' | 'FILE_UPLOAD'>(
    blueprint.syllabusDetails.mode || 'MANUAL'
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');

  const chapters = blueprint.syllabusDetails.chaptersOrUnits || [];

  function handleModeChange(mode: 'PRELOADED' | 'MANUAL' | 'PASTE' | 'FILE_UPLOAD') {
    setActiveMode(mode);
    onChange({
      syllabusDetails: {
        ...blueprint.syllabusDetails,
        mode,
      },
    });
  }

  function addChapter() {
    const isSchool = blueprint.educationLevel === 'SCHOOL';
    const newChapter: ChapterOrUnit = {
      name: isSchool ? `Chapter ${chapters.length + 1}: ` : `Unit ${chapters.length + 1}: `,
      topics: [],
    };
    onChange({
      syllabusDetails: {
        ...blueprint.syllabusDetails,
        chaptersOrUnits: [...chapters, newChapter],
      },
    });
  }

  function updateChapter(idx: number, updates: Partial<ChapterOrUnit>) {
    const updated = [...chapters];
    updated[idx] = { ...updated[idx], ...updates };
    onChange({
      syllabusDetails: {
        ...blueprint.syllabusDetails,
        chaptersOrUnits: updated,
      },
    });
  }

  function removeChapter(idx: number) {
    const updated = chapters.filter((_, i) => i !== idx);
    onChange({
      syllabusDetails: {
        ...blueprint.syllabusDetails,
        chaptersOrUnits: updated,
      },
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExtracting(true);
      setUploadFileName(file.name);

      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/question-generator/extract-syllabus', {
        method: 'POST',
        body: formData,
      });

      if (res.success && res.data?.extractedText) {
        toast.success(`Successfully extracted ${res.data.charCount} characters from ${file.name}`);
        onChange({
          syllabusDetails: {
            ...blueprint.syllabusDetails,
            rawText: res.data.extractedText,
            mode: 'FILE_UPLOAD',
          },
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract text from document');
    } finally {
      setIsExtracting(false);
    }
  }

  function applyPresetCurriculum(subjectName: string, chaptersList: any[]) {
    onChange({
      subject: subjectName,
      syllabusDetails: {
        ...blueprint.syllabusDetails,
        chaptersOrUnits: chaptersList.map((c) => ({
          name: c.name,
          topics: c.topics || [],
        })),
        mode: 'PRELOADED',
      },
    });
    toast.success(`Loaded standard syllabus for ${subjectName} (${chaptersList.length} chapters/units)`);
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="border-b border-[#EFEBE9] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#6D4C41]" />
            Step 3: Syllabus Coverage & Chapter Selection
          </h2>
          <p className="text-xs text-[#6D4C41] mt-1">
            Specify the chapters, units, or topics to be assessed. AI will generate questions strictly from this content.
          </p>
        </div>

        {/* Coverage Mode */}
        <div className="flex items-center gap-2 bg-white border border-[#D7CCC8] p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() =>
              onChange({
                syllabusDetails: { ...blueprint.syllabusDetails, coverageType: 'FULL' },
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              blueprint.syllabusDetails.coverageType === 'FULL'
                ? 'bg-[#4E342E] text-white shadow-sm'
                : 'text-[#6D4C41] hover:text-[#2D1E18]'
            }`}
          >
            Full Syllabus
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                syllabusDetails: { ...blueprint.syllabusDetails, coverageType: 'PORTIONS' },
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              blueprint.syllabusDetails.coverageType === 'PORTIONS'
                ? 'bg-[#4E342E] text-white shadow-sm'
                : 'text-[#6D4C41] hover:text-[#2D1E18]'
            }`}
          >
            Specified Portions
          </button>
        </div>
      </div>

      {/* Input Mode Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => handleModeChange('MANUAL')}
          className={`p-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1.5 ${
            activeMode === 'MANUAL'
              ? 'bg-[#4E342E] border-[#4E342E] text-white shadow-md'
              : 'bg-white border-[#D7CCC8] text-[#5D4037] hover:border-[#6D4C41]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Manual Entry</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('PRELOADED')}
          className={`p-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1.5 ${
            activeMode === 'PRELOADED'
              ? 'bg-[#4E342E] border-[#4E342E] text-white shadow-md'
              : 'bg-white border-[#D7CCC8] text-[#5D4037] hover:border-[#6D4C41]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Preloaded Curricula</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('PASTE')}
          className={`p-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1.5 ${
            activeMode === 'PASTE'
              ? 'bg-[#4E342E] border-[#4E342E] text-white shadow-md'
              : 'bg-white border-[#D7CCC8] text-[#5D4037] hover:border-[#6D4C41]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Syllabus</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('FILE_UPLOAD')}
          className={`p-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1.5 ${
            activeMode === 'FILE_UPLOAD'
              ? 'bg-[#4E342E] border-[#4E342E] text-white shadow-md'
              : 'bg-white border-[#D7CCC8] text-[#5D4037] hover:border-[#6D4C41]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload File (PDF/DOCX)</span>
        </button>
      </div>

      {/* MODE 1: PRELOADED CURRICULA */}
      {activeMode === 'PRELOADED' && (
        <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-4">
          <div className="text-xs font-bold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6D4C41]" />
            Instant Curricula Library
          </div>
          <p className="text-xs text-[#6D4C41]">
            Select a verified syllabus outline to automatically configure chapters and topics:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {blueprint.educationLevel === 'SCHOOL' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const preset = preloadedCurricula?.school?.TN_STATE_BOARD?.[0]?.subjects?.[0];
                    if (preset) applyPresetCurriculum('Mathematics', preset.chapters);
                  }}
                  className="p-3 rounded-xl border border-[#D7CCC8] bg-[#FDFBF7] hover:bg-[#F7F2EF] text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#2D1E18]">Class 10 Mathematics (TN State Board)</div>
                    <div className="text-[11px] text-[#6D4C41]">Relations, Algebra, Geometry, Trigonometry (8 Chapters)</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#6D4C41] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const preset = preloadedCurricula?.school?.TN_STATE_BOARD?.[0]?.subjects?.[1];
                    if (preset) applyPresetCurriculum('Science', preset.chapters);
                  }}
                  className="p-3 rounded-xl border border-[#D7CCC8] bg-[#FDFBF7] hover:bg-[#F7F2EF] text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#2D1E18]">Class 10 Science (TN State Board)</div>
                    <div className="text-[11px] text-[#6D4C41]">Laws of Motion, Optics, Electricity, Carbon (9 Chapters)</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#6D4C41] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const preset = preloadedCurricula?.school?.CBSE?.[0]?.subjects?.[0];
                    if (preset) applyPresetCurriculum('Mathematics', preset.chapters);
                  }}
                  className="p-3 rounded-xl border border-[#D7CCC8] bg-[#FDFBF7] hover:bg-[#F7F2EF] text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#2D1E18]">Class 10 Mathematics (CBSE)</div>
                    <div className="text-[11px] text-[#6D4C41]">Real Numbers, Polynomials, Triangles, Trig (8 Chapters)</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#6D4C41] shrink-0" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const preset = preloadedCurricula?.college?.ENGINEERING?.[0]?.subjects?.[0];
                    if (preset) applyPresetCurriculum('Design and Analysis of Algorithms', preset.units);
                  }}
                  className="p-3 rounded-xl border border-[#D7CCC8] bg-[#FDFBF7] hover:bg-[#F7F2EF] text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#2D1E18]">Design & Analysis of Algorithms (B.E. CSE)</div>
                    <div className="text-[11px] text-[#6D4C41]">Units I to V: Foundations, D&C, DP, Greedy, NP-Complete</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#6D4C41] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const preset = preloadedCurricula?.college?.ENGINEERING?.[0]?.subjects?.[1];
                    if (preset) applyPresetCurriculum('Database Management Systems', preset.units);
                  }}
                  className="p-3 rounded-xl border border-[#D7CCC8] bg-[#FDFBF7] hover:bg-[#F7F2EF] text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#2D1E18]">Database Management Systems (B.E. CSE)</div>
                    <div className="text-[11px] text-[#6D4C41]">Units I to V: Relational Model, ER & Normalization, ACID, Query</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#6D4C41] shrink-0" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: MANUAL CHAPTER / UNIT BUILDER */}
      {(activeMode === 'MANUAL' || activeMode === 'PRELOADED') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4E342E] uppercase tracking-wider">
              {blueprint.educationLevel === 'SCHOOL' ? 'Chapters & Key Topics' : 'University Units & Subtopics'} ({chapters.length})
            </span>
            <button
              type="button"
              onClick={addChapter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {blueprint.educationLevel === 'SCHOOL' ? 'Chapter' : 'Unit'}</span>
            </button>
          </div>

          {chapters.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-dashed border-[#D7CCC8] text-center space-y-2">
              <BookOpen className="w-8 h-8 text-[#A1887F] mx-auto" />
              <div className="text-xs font-bold text-[#4E342E]">No chapters or units added yet</div>
              <p className="text-[11px] text-[#8D6E63] max-w-sm mx-auto">
                Click "Add Chapter/Unit" or select "Preloaded Curricula" above to quickly configure your syllabus.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chapters.map((chap, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-[#D7CCC8] shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#F7F2EF] text-[#6D4C41] text-xs font-bold flex items-center justify-center shrink-0 border border-[#D7CCC8]/60">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={chap.name}
                      onChange={(e) => updateChapter(idx, { name: e.target.value })}
                      placeholder={blueprint.educationLevel === 'SCHOOL' ? 'Chapter Name / Title' : 'Unit Title (e.g. Unit I: Linear Data Structures)'}
                      className="flex-1 bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]/30 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => removeChapter(idx)}
                      className="text-[#8D6E63] hover:text-rose-600 p-1.5 rounded-lg transition"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={chap.topics?.join(', ') || ''}
                      onChange={(e) =>
                        updateChapter(idx, {
                          topics: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Topics / Focus areas separated by commas (e.g., Ordering, Inverses, Quadratic Formula)"
                      className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#4E342E] placeholder:text-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]/30 font-normal"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: PASTE TEXT */}
      {activeMode === 'PASTE' && (
        <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-3">
          <label className="block text-xs font-bold text-[#4E342E] uppercase tracking-wider">
            Paste Syllabus Text / Course Outline
          </label>
          <textarea
            rows={8}
            value={blueprint.syllabusDetails.rawText || ''}
            onChange={(e) =>
              onChange({
                syllabusDetails: { ...blueprint.syllabusDetails, rawText: e.target.value },
              })
            }
            placeholder="Paste syllabus text here. You can include chapters, units, recommended textbooks, and specific learning outcomes..."
            className="w-full bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl p-3.5 text-xs text-[#2D1E18] placeholder:text-[#A1887F] focus:outline-none focus:ring-2 focus:ring-[#6D4C41]/30 font-mono leading-relaxed"
          />
          <div className="text-[11px] text-[#8D6E63]">
            {blueprint.syllabusDetails.rawText?.length || 0} characters entered. Prompt injection patterns will be automatically sanitized.
          </div>
        </div>
      )}

      {/* MODE 4: FILE UPLOAD */}
      {activeMode === 'FILE_UPLOAD' && (
        <div className="p-6 rounded-2xl bg-white border border-dashed border-[#D7CCC8] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F2EF] text-[#6D4C41] flex items-center justify-center mx-auto border border-[#D7CCC8]/60">
            <FileUp className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#2D1E18] uppercase tracking-wider">
              Upload Syllabus Document
            </h3>
            <p className="text-[11px] text-[#8D6E63] mt-1">
              Supports .pdf, .docx, and .txt files (Max 25MB). Server extracts and sanitizes actual document text.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-semibold shadow-md cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>{isExtracting ? 'Extracting Text...' : 'Choose Document File'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              disabled={isExtracting}
              className="hidden"
            />
          </label>

          {uploadFileName && (
            <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 max-w-md mx-auto">
              Extracted from: <span className="font-bold">{uploadFileName}</span>
            </div>
          )}

          {blueprint.syllabusDetails.rawText && (
            <div className="text-left mt-4">
              <label className="block text-[11px] font-bold text-[#4E342E] uppercase mb-1">
                Extracted Syllabus Preview:
              </label>
              <div className="max-h-40 overflow-y-auto bg-[#FDFBF7] border border-[#D7CCC8] rounded-xl p-3 text-xs text-[#2D1E18] font-mono whitespace-pre-wrap">
                {blueprint.syllabusDetails.rawText.slice(0, 1000)}
                {blueprint.syllabusDetails.rawText.length > 1000 && '... [truncated]'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

