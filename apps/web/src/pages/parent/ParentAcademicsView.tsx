import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Star,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle,
  User,
} from 'lucide-react';

interface ParentAcademicsViewProps {
  student: any;
}

export const ParentAcademicsView: React.FC<ParentAcademicsViewProps> = ({ student }) => {
  const [academicData, setAcademicData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAcademics() {
      if (!student?.id) return;
      try {
        setLoading(true);
        const res = await apiFetch(`/parents/students/${student.id}/academics`);
        if (res.success && res.data) {
          setAcademicData(res.data);
        }
      } catch (err) {
        console.error('[Academics Fetch Error]', err);
      } finally {
        setLoading(false);
      }
    }

    loadAcademics();
  }, [student?.id]);

  const subjects = academicData?.subjects || [];
  const homework = academicData?.homework || [];
  const feedbacks = academicData?.feedbacks || [];
  const upcomingExams = academicData?.upcomingExams || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#6D4C41]" /> Academic Reports & Class Schedule
        </h2>
        <p className="text-xs text-[#6D4C41] mt-0.5">
          Curriculum subjects, timetable, homework assignments, and faculty feedback for{' '}
          <strong className="text-[#2D1E18]">{student?.firstName} {student?.lastName}</strong>
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#8D6E63]">
          Loading academic reports...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Assigned Curriculum Subjects & Timetable */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h3 className="text-sm font-bold text-[#2D1E18] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6D4C41]" /> Curriculum Subjects & Weekly Schedule
              </h3>
              <span className="text-xs text-[#8D6E63]">
                Batch: <strong className="text-[#2D1E18]">{academicData?.student?.batchName}</strong>
              </span>
            </div>

            {subjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 hover:border-[#4E342E] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#2D1E18]">{sub.name}</h4>
                        {sub.code && (
                          <span className="text-[10px] font-mono text-[#8D6E63]">{sub.code}</span>
                        )}
                      </div>
                      <span className="p-1.5 rounded-lg bg-[#4E342E]/10 text-[#4E342E]">
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="text-xs text-[#6D4C41] space-y-1 pt-1 border-t border-[#D7CCC8]/60">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#8D6E63]" />
                        <span>{sub.schedule}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#8D6E63]" />
                        <span>Faculty: <strong className="text-[#2D1E18]">{sub.teacher}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#8D6E63]">
                No subjects currently assigned to this batch.
              </div>
            )}
          </div>

          {/* Section 2: Homework & Assignments */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#2D1E18] flex items-center gap-2 border-b border-[#EFEBE9] pb-3">
              <FileText className="w-4 h-4 text-[#6D4C41]" /> Homework & Assigned Tasks ({homework.length})
            </h3>

            {homework.length > 0 ? (
              <div className="space-y-3">
                {homework.map((hw: any) => (
                  <div
                    key={hw.id}
                    className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#2D1E18] text-sm">{hw.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#4E342E]/10 text-[#4E342E]">
                          {hw.subject}
                        </span>
                      </div>
                      {hw.description && (
                        <p className="text-[#6D4C41] line-clamp-1">{hw.description}</p>
                      )}
                      <div className="text-[#8D6E63] flex items-center gap-3 text-[11px] pt-0.5">
                        <span>Assigned by: <strong>{hw.teacher}</strong></span>
                        {hw.dueDate && (
                          <span>
                            Due:{' '}
                            <strong className="text-[#2D1E18]">
                              {new Date(hw.dueDate).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          hw.submissionStatus === 'GRADED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : hw.submissionStatus === 'SUBMITTED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {hw.submissionStatus === 'GRADED'
                          ? `Graded (${hw.grade || 'Passed'})`
                          : hw.submissionStatus === 'SUBMITTED'
                          ? 'Submitted'
                          : 'Pending Submission'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8D6E63]">
                No pending homework or tasks assigned at this time.
              </div>
            )}
          </div>

          {/* Section 3: Teacher Progress Feedback & Reviews */}
          <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#2D1E18] flex items-center gap-2 border-b border-[#EFEBE9] pb-3">
              <Sparkles className="w-4 h-4 text-[#6D4C41]" /> Faculty Academic Feedback & Reviews
            </h3>

            {feedbacks.length > 0 ? (
              <div className="space-y-3">
                {feedbacks.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-5 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-[#2D1E18] text-sm">{f.termName}</span>
                        <span className="text-[#8D6E63] text-[11px] block mt-0.5">
                          Assessed by {f.teacher} &bull;{' '}
                          {new Date(f.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {f.rating && (
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, rIdx) => (
                            <Star
                              key={rIdx}
                              className={`w-4 h-4 ${
                                rIdx < f.rating ? 'fill-amber-400 text-amber-500' : 'text-[#D7CCC8]'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-[#2D1E18] leading-relaxed italic bg-white p-3 rounded-xl border border-[#D7CCC8]/60">
                      "{f.remarks}"
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {f.strengths && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                          <strong className="block text-emerald-800 uppercase text-[10px]">Key Strengths:</strong>
                          <span className="mt-0.5 block">{f.strengths}</span>
                        </div>
                      )}
                      {f.improvements && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                          <strong className="block text-amber-800 uppercase text-[10px]">Areas to Improve:</strong>
                          <span className="mt-0.5 block">{f.improvements}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8D6E63]">
                No progress reports have been published for this term yet.
              </div>
            )}
          </div>

          {/* Section 4: Upcoming Examinations */}
          {upcomingExams.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#2D1E18] flex items-center gap-2 border-b border-[#EFEBE9] pb-3">
                <Award className="w-4 h-4 text-[#6D4C41]" /> Scheduled Upcoming Examinations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="p-4 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-[#2D1E18]">{exam.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4E342E]/10 text-[#4E342E]">
                        {exam.subject}
                      </span>
                    </div>
                    <div className="text-[#6D4C41] space-y-0.5">
                      <p>Type: <strong>{exam.examType}</strong></p>
                      <p>
                        Date:{' '}
                        <strong className="text-[#2D1E18]">
                          {new Date(exam.examDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </p>
                      <p>Total Marks: <strong>{exam.totalMarks}</strong> (Pass: {exam.passingMarks})</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
