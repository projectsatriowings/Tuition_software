import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Star,
  MessageCircle,
  Plus,
  User,
  Send,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  X,
} from 'lucide-react';

export const ProgressReviewsManagement: React.FC = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaffOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ACADEMIC_ADMIN' || user?.role === 'STAFF';

  const [activeTab, setActiveTab] = useState<'feedback' | 'reviews'>('feedback');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Parent review submission
  const [myChildren, setMyChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Staff feedback submission modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [feedbackStudentId, setFeedbackStudentId] = useState('');
  const [feedbackBatchId, setFeedbackBatchId] = useState('');
  const [termName, setTermName] = useState('Quarter 1');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [remarks, setRemarks] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Admin reply
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      if (activeTab === 'feedback') {
        if (isParent) {
          const childRes = await apiFetch('/parents/my/children');
          const childrenList = childRes.data?.children || [];
          setMyChildren(childrenList);
          if (childrenList.length > 0) {
            const firstChildId = childrenList[0].student.id;
            const res = await apiFetch(`/progress/students/${firstChildId}`);
            if (res.success) setFeedbacks(res.data.feedbacks || []);
          }
        } else if (user?.role === 'STUDENT') {
          const profileRes = await apiFetch('/students/my/profile');
          if (profileRes.success && profileRes.data?.student?.id) {
            const res = await apiFetch(`/progress/students/${profileRes.data.student.id}`);
            if (res.success) setFeedbacks(res.data.feedbacks || []);
          }
        } else {
          // Staff/Admin loads students list for selection
          const sRes = await apiFetch('/students?limit=50');
          const stList = sRes.data?.students || [];
          setStudents(stList);
          if (stList.length > 0) {
            const res = await apiFetch(`/progress/students/${stList[0].id}`);
            if (res.success) setFeedbacks(res.data.feedbacks || []);
          }
        }
      } else {
        const res = await apiFetch('/reviews');
        if (res.success) setReviews(res.data.reviews || []);

        if (isParent) {
          const childRes = await apiFetch('/parents/my/children');
          setMyChildren(childRes.data?.children || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChildId) return;

    try {
      setSubmittingReview(true);
      const res = await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedChildId,
          rating: Number(rating),
          reviewText,
        }),
      });

      if (res.success) {
        alert('Thank you! Your feedback has been submitted.');
        setReviewText('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleCreateFeedback(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch('/progress', {
        method: 'POST',
        body: JSON.stringify({
          studentId: feedbackStudentId,
          batchId: feedbackBatchId,
          termName,
          remarks,
          rating: Number(feedbackRating),
          strengths,
          improvements,
          recommendations,
          isPublished: true,
        }),
      });

      if (res.success) {
        setShowFeedbackModal(false);
        setRemarks('');
        setStrengths('');
        setImprovements('');
        setRecommendations('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleReply(reviewId: string) {
    try {
      const res = await apiFetch(`/reviews/${reviewId}/reply`, {
        method: 'PATCH',
        body: JSON.stringify({ replyText }),
      });
      if (res.success) {
        setReplyingReviewId(null);
        setReplyText('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2D1E18] flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-[#6D4C41]" />
            <span>Academic Progress & Parent Reviews</span>
          </h1>
          <p className="text-sm text-[#6D4C41] mt-1">
            Teacher term feedback, subject mastery observations, and parent review submissions
          </p>
        </div>

        {isStaffOrAdmin && activeTab === 'feedback' && (
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl font-semibold text-sm shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Student Feedback
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D7CCC8] pb-2">
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'feedback'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18]'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Academic Progress Feedback
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'reviews'
              ? 'bg-[#4E342E] text-white shadow-sm'
              : 'text-[#6D4C41] hover:text-[#2D1E18]'
          }`}
        >
          <Star className="w-4 h-4" /> Parent Reviews & Testimonials
        </button>
      </div>

      {/* Tab 1: Progress Feedback */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-[#8D6E63] text-sm">Loading academic feedback...</div>
          ) : feedbacks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-[#D7CCC8] text-[#8D6E63] text-sm shadow-sm">
              No academic progress feedback logged for this term yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D7CCC8]/40 text-[#4E342E] border border-[#BCAAA4]">
                        {fb.termName}
                      </span>
                      <h3 className="font-bold text-[#2D1E18] text-base mt-2">
                        {fb.batch?.name || 'Class Batch'}
                      </h3>
                      <span className="text-xs text-[#6D4C41]">
                        Evaluated by: <strong>{fb.staff?.fullName || 'Faculty'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span>{fb.rating || 5}/5</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#2D1E18] leading-relaxed bg-[#F7F2EF] p-3.5 rounded-2xl border border-[#D7CCC8]">
                    "{fb.remarks}"
                  </p>

                  <div className="space-y-2 text-xs">
                    {fb.strengths && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <strong className="block text-[10px] uppercase font-bold text-emerald-900 mb-0.5">
                          Identified Strengths:
                        </strong>
                        {fb.strengths}
                      </div>
                    )}
                    {fb.improvements && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                        <strong className="block text-[10px] uppercase font-bold text-amber-900 mb-0.5">
                          Growth Areas:
                        </strong>
                        {fb.improvements}
                      </div>
                    )}
                    {fb.recommendations && (
                      <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800">
                        <strong className="block text-[10px] uppercase font-bold text-sky-900 mb-0.5">
                          Recommended Actions:
                        </strong>
                        {fb.recommendations}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-[11px] text-[#8D6E63] text-right">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Parent Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Parent Submission Form */}
          {isParent && (
            <div className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm space-y-4">
              <h2 className="text-base font-bold text-[#2D1E18] flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-current" /> Submit Feedback for Your Child
              </h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">
                      Select Linked Child *
                    </label>
                    <select
                      required
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                    >
                      <option value="">Select Child</option>
                      {myChildren.map((c) => (
                        <option key={c.student.id} value={c.student.id}>
                          {c.student.firstName} {c.student.lastName} ({c.student.admissionNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4E342E] mb-1">Rating (1-5) *</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value, 10))}
                      className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                    >
                      <option value={5}>5 Stars - Outstanding</option>
                      <option value={4}>4 Stars - Very Good</option>
                      <option value={3}>3 Stars - Satisfactory</option>
                      <option value={2}>2 Stars - Needs Attention</option>
                      <option value={1}>1 Star - Dissatisfied</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Your Review & Experience *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share your feedback regarding teaching quality, batch pace, and support..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3.5 py-2 text-sm text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview || !selectedChildId}
                  className="px-5 py-2.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Post Feedback'}
                </button>
              </form>
            </div>
          )}

          {/* Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reviews.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-[#8D6E63] text-sm italic bg-white border border-[#D7CCC8] rounded-2xl">
                No parent reviews submitted yet.
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-6 rounded-3xl bg-white border border-[#D7CCC8] shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[#2D1E18] text-sm">
                        {rev.parent?.user?.fullName || 'Verified Parent'}
                      </h4>
                      <span className="text-[11px] text-[#6D4C41]">
                        Parent of <strong>{rev.student?.firstName} {rev.student?.lastName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#2D1E18] italic bg-[#F7F2EF] p-3 rounded-2xl border border-[#D7CCC8]">
                    "{rev.reviewText}"
                  </p>

                  {/* Staff Reply */}
                  {rev.replyText ? (
                    <div className="p-3 rounded-xl bg-[#F7F2EF] border border-[#D7CCC8] text-xs space-y-1">
                      <strong className="text-[10px] uppercase font-bold text-[#4E342E] block">
                        Institute Response:
                      </strong>
                      <p className="text-[#2D1E18]">{rev.replyText}</p>
                    </div>
                  ) : isStaffOrAdmin && replyingReviewId !== rev.id ? (
                    <button
                      onClick={() => setReplyingReviewId(rev.id)}
                      className="text-xs text-[#4E342E] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Reply to Review
                    </button>
                  ) : null}

                  {replyingReviewId === rev.id && (
                    <div className="space-y-2 pt-2 border-t border-[#EFEBE9]">
                      <input
                        type="text"
                        placeholder="Type response to parent..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-lg px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingReviewId(null)}
                          className="px-2.5 py-1 text-xs text-[#8D6E63]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(rev.id)}
                          className="px-3 py-1 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-lg text-xs font-semibold"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-[#8D6E63] text-right">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Staff Add Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7CCC8] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFEBE9] pb-3">
              <h2 className="text-xl font-bold text-[#2D1E18] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#6D4C41]" /> Log Academic Progress Feedback
              </h2>
              <button onClick={() => setShowFeedbackModal(false)} className="text-[#8D6E63] hover:text-[#2D1E18]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFeedback} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Student *</label>
                <select
                  required
                  value={feedbackStudentId}
                  onChange={(e) => {
                    setFeedbackStudentId(e.target.value);
                    const selected = students.find((s) => s.id === e.target.value);
                    if (selected?.enrollments?.[0]?.batchId) {
                      setFeedbackBatchId(selected.enrollments[0].batchId);
                    }
                  }}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                >
                  <option value="">Select Student</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Term / Evaluation *</label>
                  <input
                    type="text"
                    required
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E342E] mb-1">Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(parseInt(e.target.value, 10))}
                    className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Observations / Remarks *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Subject comprehension and participation..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Strengths</label>
                <input
                  type="text"
                  placeholder="e.g. Rapid numerical calculation"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E342E] mb-1">Recommended Actions</label>
                <input
                  type="text"
                  placeholder="e.g. Daily revision of theorem proofs"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full bg-[#F7F2EF] border border-[#D7CCC8] rounded-xl px-3 py-1.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFEBE9]">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-3 py-1.5 text-xs text-[#6D4C41] hover:bg-[#F7F2EF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4E342E] hover:bg-[#3E2723] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
