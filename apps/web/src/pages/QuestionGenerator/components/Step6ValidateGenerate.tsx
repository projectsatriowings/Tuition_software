import React, { useState } from 'react';
import { QuestionPaperBlueprint } from '../types';
import { apiFetch } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface Step6Props {
  blueprint: QuestionPaperBlueprint;
  aiProviderInfo?: any;
  onGenerateSuccess: (result: any) => void;
  isGenerating: boolean;
  setIsGenerating: (g: boolean) => void;
}

export const Step6ValidateGenerate: React.FC<Step6Props> = ({
  blueprint,
  aiProviderInfo,
  onGenerateSuccess,
  isGenerating,
  setIsGenerating,
}) => {
  const toast = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generationStep, setGenerationStep] = useState<string>('');

  // Check client marks balance
  let attemptedMarks = 0;
  let printedMarks = 0;
  let totalPrintedQuestions = 0;
  let totalAttemptedQuestions = 0;

  blueprint.sections.forEach((s) => {
    const req = s.requiredQuestions !== undefined ? s.requiredQuestions : s.numberOfQuestions;
    attemptedMarks += req * s.marksPerQuestion;
    printedMarks += s.numberOfQuestions * s.marksPerQuestion;
    totalAttemptedQuestions += req;
    totalPrintedQuestions += s.numberOfQuestions;
  });

  const marksMatch = attemptedMarks === blueprint.totalMarks;

  async function handlePreValidate() {
    try {
      setIsValidating(true);
      setValidationErrors([]);
      const res = await apiFetch('/question-generator/blueprint/validate', {
        method: 'POST',
        body: JSON.stringify(blueprint),
      });

      if (res.success) {
        setValidationResult(res.data);
        toast.success('Blueprint verification passed! All sections and marks strictly align.');
      }
    } catch (err: any) {
      const issues = err?.data?.issues?.map((i: any) => `${i.path}: ${i.message}`) || [err.message];
      setValidationErrors(issues);
      toast.error('Blueprint validation issues found. Please review.');
    } finally {
      setIsValidating(false);
    }
  }

  async function handleGenerate() {
    if (!marksMatch) {
      toast.error(
        `Cannot generate: Marks mismatch! Attempted marks sum to ${attemptedMarks}, but total requested is ${blueprint.totalMarks}. Please adjust in Step 4.`
      );
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationStep('Auditing syllabus alignment and question constraints...');

      setTimeout(() => {
        setGenerationStep('Constructing pedagogical structured blueprint...');
      }, 700);

      setTimeout(() => {
        setGenerationStep('Executing AI question generation and answer key synthesis...');
      }, 1500);

      const res = await apiFetch('/question-generator/generate', {
        method: 'POST',
        body: JSON.stringify(blueprint),
      });

      if (res.success) {
        toast.success('Question paper successfully synthesized!');
        onGenerateSuccess(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="border-b border-[#EFEBE9] pb-4">
        <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#6D4C41]" />
          Step 6: Blueprint Verification & AI Generation
        </h2>
        <p className="text-xs text-[#6D4C41] mt-1">
          Review the complete examination specification. Once validated, trigger the AI generation engine.
        </p>
      </div>

      {/* AI ENGINE STATUS BADGE */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          aiProviderInfo?.isLiveAi
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              aiProviderInfo?.isLiveAi ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {aiProviderInfo?.isLiveAi ? 'Active AI Provider' : 'Development Mock Engine Active'}
            </div>
            <div className="text-xs mt-0.5">
              {aiProviderInfo?.isLiveAi ? (
                <span>
                  Connected to <strong>{aiProviderInfo?.provider?.toUpperCase()}</strong> ({aiProviderInfo?.model})
                </span>
              ) : (
                <span>
                  No API key in local environment. Running in{' '}
                  <strong>Safe Pedagogical Mock Mode</strong> with complete syllabus & blueprint adherence.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-[11px] font-bold px-3 py-1 rounded-lg bg-white/80 border border-current shrink-0">
          {aiProviderInfo?.isLiveAi ? 'PRODUCTION READY' : 'DEVELOPMENT MODE'}
        </div>
      </div>

      {/* BLUEPRINT SUMMARY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-3">
          <div className="text-xs font-bold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#6D4C41]" />
            Academic Context
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Tier</span>
              <strong className="text-[#2D1E18]">{blueprint.educationLevel}</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Academic Year</span>
              <strong className="text-[#2D1E18]">{blueprint.academicYear}</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Target</span>
              <strong className="text-[#2D1E18]">
                {blueprint.educationLevel === 'SCHOOL' ? blueprint.standard : blueprint.degree}
              </strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Subject</span>
              <strong className="text-[#2D1E18]">{blueprint.subject}</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Exam Type</span>
              <strong className="text-[#2D1E18]">{blueprint.examType}</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Language</span>
              <strong className="text-[#2D1E18]">{blueprint.language}</strong>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D7CCC8] space-y-3">
          <div className="text-xs font-bold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#6D4C41]" />
            Marks & Structure Summary
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Total Marks Requested</span>
              <strong className="text-[#2D1E18]">{blueprint.totalMarks} Marks</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Calculated Attempted</span>
              <strong className={marksMatch ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {attemptedMarks} Marks {marksMatch ? '✓' : '⚠️'}
              </strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Duration</span>
              <strong className="text-[#2D1E18]">{blueprint.durationMinutes} Minutes</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Sections Count</span>
              <strong className="text-[#2D1E18]">{blueprint.sections.length} Sections</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Total Printed Questions</span>
              <strong className="text-[#2D1E18]">{totalPrintedQuestions} Questions</strong>
            </div>
            <div>
              <span className="text-[#8D6E63] block text-[10px]">Difficulty Rigor</span>
              <strong className="text-[#2D1E18]">{blueprint.difficulty}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors If Any */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
          <div className="text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Validation Issues Detected:
          </div>
          <ul className="text-xs list-disc list-inside space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ACTIONS */}
      <div className="p-6 rounded-3xl bg-[#3E2723] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D7CCC8]" />
            Ready for Synthesis
          </h3>
          <p className="text-xs text-[#D7CCC8] mt-0.5">
            {isGenerating
              ? generationStep || 'Generating question paper and marking scheme...'
              : 'Click below to initiate generation according to your defined blueprint.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePreValidate}
            disabled={isValidating || isGenerating}
            className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-[#D7CCC8] hover:text-white hover:bg-white/10 transition"
          >
            {isValidating ? 'Checking...' : 'Pre-Validate Blueprint'}
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!marksMatch || isGenerating}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition ${
              !marksMatch || isGenerating
                ? 'bg-white/20 text-white/50 cursor-not-allowed'
                : 'bg-white text-[#3E2723] hover:bg-[#F7F2EF] hover:shadow-xl'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#3E2723]" />
                <span>Generating Paper...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#3E2723]" />
                <span>Generate Question Paper</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

