import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { themeTokens } from '@tuition/shared';
import { mobileApiFetch } from '../services/api';
import { MobileButton, ProgressBar } from './ui';
import { Badge } from './Badge';

export interface QuizTakerModalProps {
  quiz: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const QuizTakerModal: React.FC<QuizTakerModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptStartTimeRef = useRef<number | null>(null);
  const durationSecondsRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Start Quiz Attempt on Open
  const initializeAttempt = useCallback(async () => {
    if (!quiz?.id) return;
    setLoading(true);
    setQuizResult(null);
    setCurrentIndex(0);
    setSelectedAnswers({});

    try {
      const res = await mobileApiFetch(`/quizzes/${quiz.id}/start`, { method: 'POST' });
      if (res.success && res.data) {
        const qData = res.data.quiz;
        const attData = res.data.attempt;
        setActiveQuiz(qData);
        setAttempt(attData);

        // Prepopulate existing answers if resuming in-progress attempt
        if (attData.answers && Array.isArray(attData.answers)) {
          const prefilled: Record<string, string[]> = {};
          attData.answers.forEach((ans: any) => {
            if (ans.questionId && ans.selectedOptionIds) {
              prefilled[ans.questionId] = ans.selectedOptionIds;
            }
          });
          setSelectedAnswers(prefilled);
        }

        // Setup timer based on authoritative attempt start time
        if (qData.durationMinutes) {
          const totalSecs = qData.durationMinutes * 60;
          durationSecondsRef.current = totalSecs;

          const startedAt = attData.createdAt ? new Date(attData.createdAt).getTime() : Date.now();
          attemptStartTimeRef.current = startedAt;

          const elapsedSecs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
          const leftSecs = Math.max(0, totalSecs - elapsedSecs);
          setRemainingSeconds(leftSecs);
        }
      } else {
        Alert.alert('Cannot Start Quiz', res.error || 'This quiz is not currently available for attempts.', [
          { text: 'OK', onPress: onClose },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Unable to connect to quiz server.', [
        { text: 'OK', onPress: onClose },
      ]);
    } finally {
      setLoading(false);
    }
  }, [quiz?.id, onClose]);

  useEffect(() => {
    if (isOpen) {
      initializeAttempt();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, initializeAttempt]);

  // Submit Handler
  const handleSubmit = useCallback(
    async (isAuto = false) => {
      if (submitting || !activeQuiz?.id || !attempt?.id) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setSubmitting(true);
      try {
        const answersPayload = Object.entries(selectedAnswers).map(
          ([questionId, selectedOptionIds]) => ({
            questionId,
            selectedOptionIds,
          })
        );

        const res = await mobileApiFetch(`/quizzes/${activeQuiz.id}/submit`, {
          method: 'POST',
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: answersPayload,
          }),
        });

        if (res.success && res.data) {
          setQuizResult(res.data);
          onSubmitted?.();
        } else {
          Alert.alert('Submission Error', res.error || 'Failed to submit quiz attempt.');
        }
      } catch (err: any) {
        Alert.alert('Submission Failure', err.message || 'Could not reach server. Please retry.');
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, activeQuiz?.id, attempt?.id, selectedAnswers, onSubmitted]
  );

  // Active Timer Interval
  useEffect(() => {
    if (remainingSeconds === null || quizResult) return;

    timerRef.current = setInterval(() => {
      if (attemptStartTimeRef.current && durationSecondsRef.current) {
        const elapsed = Math.floor((Date.now() - attemptStartTimeRef.current) / 1000);
        const left = Math.max(0, durationSecondsRef.current - elapsed);
        setRemainingSeconds(left);

        if (left <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          Alert.alert('Time Up!', 'Your quiz duration has expired. Answers are being submitted automatically.', [
            { text: 'OK' },
          ]);
          handleSubmit(true);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds, quizResult, handleSubmit]);

  // Handle App Backgrounding / Resuming Timer Re-sync
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        attemptStartTimeRef.current &&
        durationSecondsRef.current &&
        !quizResult
      ) {
        const elapsed = Math.floor((Date.now() - attemptStartTimeRef.current) / 1000);
        const left = Math.max(0, durationSecondsRef.current - elapsed);
        setRemainingSeconds(left);
        if (left <= 0) {
          handleSubmit(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [quizResult, handleSubmit]);

  // Warn on Attempt Exit
  const handleRequestClose = () => {
    if (quizResult) {
      onClose();
      return;
    }
    const questionsCount = activeQuiz?.questions?.length || 0;
    const answeredCount = Object.keys(selectedAnswers).length;

    Alert.alert(
      'Leave Quiz?',
      `You have answered ${answeredCount} of ${questionsCount} questions. If you exit now, your attempt will remain active until the timer expires.`,
      [
        { text: 'Continue Quiz', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onClose },
      ]
    );
  };

  const handleSelectOption = (questionId: string, optionId: string, qType: string) => {
    if (quizResult) return;

    if (qType === 'SINGLE_CHOICE' || qType === 'TRUE_FALSE') {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: [optionId],
      }));
    } else {
      // Multiple Choice
      const current = selectedAnswers[questionId] || [];
      const exists = current.includes(optionId);
      const updated = exists ? current.filter((id) => id !== optionId) : [...current, optionId];
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: updated,
      }));
    }
  };

  const formatTimer = (sec: number | null) => {
    if (sec === null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const questions = activeQuiz?.questions || [];
  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isTimerCritical = (remainingSeconds ?? 100) < 60;
  const isTimerWarning = (remainingSeconds ?? 200) < 300;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={handleRequestClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleRequestClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeQuiz?.title || quiz?.title || 'Online Assessment'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {activeQuiz?.subject?.name || quiz?.subject?.name || 'Classroom Quiz'}
              </Text>
            </View>

            {remainingSeconds !== null && !quizResult ? (
              <View
                style={[
                  styles.timerBadge,
                  isTimerCritical
                    ? styles.timerCritical
                    : isTimerWarning
                    ? styles.timerWarning
                    : styles.timerNormal,
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    isTimerCritical ? styles.timerTextCritical : styles.timerTextNormal,
                  ]}
                >
                  ⏱ {formatTimer(remainingSeconds)}
                </Text>
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Progress Bar */}
          {!loading && !quizResult && totalQuestions > 0 && (
            <View style={styles.progressSection}>
              <ProgressBar
                progress={totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}
                color={themeTokens.colors.primary}
                height={6}
              />
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  Question {currentIndex + 1} of {totalQuestions}
                </Text>
                <Text style={styles.answeredBadge}>
                  {answeredCount}/{totalQuestions} answered
                </Text>
              </View>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeTokens.colors.primary} />
            <Text style={styles.loadingText}>Initializing secure quiz attempt...</Text>
          </View>
        ) : quizResult ? (
          /* RESULT SCORECARD */
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <View style={styles.resultCard}>
              <View style={styles.trophyCircle}>
                <Text style={styles.trophyIcon}>🏆</Text>
              </View>

              <Text style={styles.resultTitle}>Quiz Completed!</Text>
              <Text style={styles.resultSub}>Your answers have been securely recorded & evaluated.</Text>

              <View style={styles.scoreRow}>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>
                    {quizResult.score ?? quizResult.marksObtained ?? 0}
                    <Text style={styles.scoreMax}> / {quizResult.totalMarks ?? activeQuiz?.totalMarks ?? 10}</Text>
                  </Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreLabel}>Percentage</Text>
                  <Text style={styles.scoreValue}>{quizResult.percentage ?? 0}%</Text>
                </View>
              </View>

              <View style={styles.resultMeta}>
                <Badge
                  label={quizResult.percentage >= 50 ? 'PASSED' : 'NEEDS PRACTICE'}
                  variant={quizResult.percentage >= 50 ? 'success' : 'warning'}
                />
              </View>
            </View>

            <MobileButton
              title="Done & Return to Learning"
              onPress={onClose}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: 24 }}
            />
          </ScrollView>
        ) : (
          /* ACTIVE QUESTION TAKER */
          <View style={styles.body}>
            {/* Question Selector Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsScroll}
            >
              {questions.map((q: any, i: number) => {
                const isAnswered = (selectedAnswers[q.id]?.length || 0) > 0;
                const isCurrent = i === currentIndex;
                return (
                  <TouchableOpacity
                    key={q.id || i}
                    onPress={() => setCurrentIndex(i)}
                    style={[
                      styles.qPill,
                      isCurrent && styles.qPillCurrent,
                      !isCurrent && isAnswered && styles.qPillAnswered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.qPillText,
                        isCurrent && styles.qPillTextCurrent,
                        !isCurrent && isAnswered && styles.qPillTextAnswered,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.questionContainer}>
              {currentQ ? (
                <View>
                  {/* Question Header Card */}
                  <View style={styles.questionCard}>
                    <View style={styles.qCardHeader}>
                      <Badge
                        label={`Question ${currentIndex + 1}`}
                        variant="indigo"
                        size="sm"
                      />
                      <Text style={styles.marksBadge}>{currentQ.marks || 1} mark(s)</Text>
                    </View>

                    <Text style={styles.questionText}>{currentQ.questionText}</Text>
                    {currentQ.questionType === 'MULTIPLE_CHOICE' && (
                      <Text style={styles.qInstruction}>• Select all options that apply</Text>
                    )}
                  </View>

                  {/* Options List */}
                  <View style={styles.optionsList}>
                    {currentQ.options?.map((opt: any, optIdx: number) => {
                      const isSelected = selectedAnswers[currentQ.id]?.includes(opt.id);
                      const isMulti = currentQ.questionType === 'MULTIPLE_CHOICE';

                      return (
                        <TouchableOpacity
                          key={opt.id || optIdx}
                          onPress={() =>
                            handleSelectOption(currentQ.id, opt.id, currentQ.questionType)
                          }
                          activeOpacity={0.7}
                          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                        >
                          <View
                            style={[
                              isMulti ? styles.checkbox : styles.radioCircle,
                              isSelected && (isMulti ? styles.checkboxSelected : styles.radioSelected),
                            ]}
                          >
                            {isSelected && (
                              <Text style={styles.checkMark}>{isMulti ? '✓' : '•'}</Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && styles.optionTextSelected,
                            ]}
                          >
                            {opt.optionText}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyQText}>No questions available in this assessment.</Text>
              )}
            </ScrollView>

            {/* Bottom Navigation Toolbar */}
            <View style={styles.footer}>
              <MobileButton
                title="← Previous"
                onPress={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                variant="secondary"
                size="md"
                disabled={currentIndex === 0 || submitting}
                style={styles.navBtn}
              />

              {currentIndex < totalQuestions - 1 ? (
                <MobileButton
                  title="Next →"
                  onPress={() => setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1))}
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  style={styles.navBtn}
                />
              ) : (
                <MobileButton
                  title="Submit Quiz"
                  onPress={() => {
                    const unanswered = totalQuestions - answeredCount;
                    if (unanswered > 0) {
                      Alert.alert(
                        'Confirm Submission',
                        `You have ${unanswered} unanswered question(s). Are you sure you want to finish and submit?`,
                        [
                          { text: 'Review Questions', style: 'cancel' },
                          { text: 'Submit Now', onPress: () => handleSubmit(false) },
                        ]
                      );
                    } else {
                      Alert.alert(
                        'Submit Answers',
                        'Are you ready to submit your quiz answers for automated evaluation?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Submit', onPress: () => handleSubmit(false) },
                        ]
                      );
                    }
                  }}
                  variant="success"
                  size="md"
                  loading={submitting}
                  style={styles.navBtn}
                />
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeTokens.colors.background,
  },
  header: {
    backgroundColor: themeTokens.colors.espresso,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.cocoa,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeTokens.colors.cocoa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: themeTokens.colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: themeTokens.typography.weights.bold,
    color: themeTokens.colors.textLight,
  },
  headerSubtitle: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textLightMuted,
    marginTop: 2,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: themeTokens.radii.full,
    borderWidth: 1,
  },
  timerNormal: {
    backgroundColor: themeTokens.colors.cocoa,
    borderColor: themeTokens.colors.taupe,
  },
  timerWarning: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
  },
  timerCritical: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  timerText: {
    fontWeight: '800',
    fontSize: themeTokens.typography.sizes.xs,
  },
  timerTextNormal: {
    color: themeTokens.colors.textLight,
  },
  timerTextCritical: {
    color: '#FEE2E2',
  },
  progressSection: {
    marginTop: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textLightMuted,
    fontWeight: '600',
  },
  answeredBadge: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.beige,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  pillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: themeTokens.colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: themeTokens.colors.border,
    gap: 8,
  },
  qPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    backgroundColor: themeTokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qPillCurrent: {
    backgroundColor: themeTokens.colors.primary,
    borderColor: themeTokens.colors.primary,
  },
  qPillAnswered: {
    backgroundColor: themeTokens.colors.successBg,
    borderColor: themeTokens.colors.successBorder,
  },
  qPillText: {
    fontSize: themeTokens.typography.sizes.sm,
    fontWeight: '700',
    color: themeTokens.colors.textSecondary,
  },
  qPillTextCurrent: {
    color: themeTokens.colors.textLight,
  },
  qPillTextAnswered: {
    color: themeTokens.colors.success,
  },
  questionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  questionCard: {
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  qCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  marksBadge: {
    fontSize: themeTokens.typography.sizes.xs,
    fontWeight: '700',
    color: themeTokens.colors.textMuted,
  },
  questionText: {
    fontSize: themeTokens.typography.sizes.base,
    fontWeight: themeTokens.typography.weights.bold,
    color: themeTokens.colors.textPrimary,
    lineHeight: 22,
  },
  qInstruction: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: themeTokens.colors.border,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: '#F7F2EF',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: themeTokens.colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: themeTokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    borderColor: themeTokens.colors.primary,
    backgroundColor: themeTokens.colors.primary,
  },
  checkMark: {
    color: themeTokens.colors.textLight,
    fontSize: 12,
    fontWeight: '900',
  },
  optionText: {
    flex: 1,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textPrimary,
    lineHeight: 20,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: themeTokens.colors.espresso,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: themeTokens.colors.surface,
    borderTopWidth: 1,
    borderTopColor: themeTokens.colors.border,
    gap: 12,
  },
  navBtn: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textMuted,
    fontWeight: '600',
  },
  emptyQText: {
    textAlign: 'center',
    color: themeTokens.colors.textSubtle,
    marginTop: 40,
    fontSize: themeTokens.typography.sizes.sm,
  },
  resultContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    width: '100%',
    backgroundColor: themeTokens.colors.surface,
    borderRadius: themeTokens.radii.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeTokens.colors.border,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trophyIcon: {
    fontSize: 34,
  },
  resultTitle: {
    fontSize: themeTokens.typography.sizes.xl,
    fontWeight: '900',
    color: themeTokens.colors.textPrimary,
  },
  resultSub: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeTokens.colors.background,
    borderRadius: themeTokens.radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 20,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: themeTokens.colors.border,
  },
  scoreLabel: {
    fontSize: themeTokens.typography.sizes.xs,
    color: themeTokens.colors.textMuted,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: themeTokens.colors.primary,
    marginTop: 2,
  },
  scoreMax: {
    fontSize: themeTokens.typography.sizes.sm,
    color: themeTokens.colors.textSubtle,
    fontWeight: '600',
  },
  resultMeta: {
    marginTop: 18,
  },
});

