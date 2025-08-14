import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain, 
  Target,
  RotateCcw,
  Download,
  Trophy
} from 'lucide-react';
import { StudyMateAI } from '@/services/StudyMateAI';
import { SessionManager } from '@/services/SessionManager';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  sourceChunk: string;
  documentId: string;
}

interface QuizResult {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  explanation: string;
}

interface QuizInterfaceProps {
  documents: Array<{ id: string; name: string; content: string; status: string }>;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ documents }) => {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<{ [key: string]: string }>({});
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);

  const sessionManager = SessionManager.getInstance();
  const ai = StudyMateAI.getInstance();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQuizActive && !isQuizCompleted) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQuizActive, isQuizCompleted]);

  // Generate quiz from documents
  const generateQuiz = async (questionCount: number = 10) => {
    if (documents.length === 0) {
      toast.error('Please upload documents first to generate a quiz');
      return;
    }

    setIsGenerating(true);
    try {
      const documentIds = documents.map(doc => doc.id);
      const quizData = await ai.generateQuizFromDocuments(documentIds, questionCount);
      
      setQuizQuestions(quizData.questions);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setQuizResults([]);
      setIsQuizCompleted(false);
      setTimeElapsed(0);
      
      toast.success(`✅ Generated ${quizData.questions.length} questions from your documents!`);
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Start quiz
  const startQuiz = () => {
    if (quizQuestions.length === 0) {
      toast.error('Please generate a quiz first');
      return;
    }

    setIsQuizActive(true);
    setQuizStartTime(new Date());
    setTimeElapsed(0);
    
    // Start a viva session for tracking
    const sessionName = `Quiz Session - ${new Date().toLocaleDateString()}`;
    sessionManager.startSession(sessionName, documents.map(doc => doc.id));
    
    toast.success('🎯 Quiz started! Answer all questions to see your results.');
  };

  // Submit answer for current question
  const submitAnswer = async () => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const studentAnswer = studentAnswers[currentQuestion.id] || '';

    if (!studentAnswer.trim()) {
      toast.error('Please provide an answer before proceeding');
      return;
    }

    try {
      const evaluation = await ai.evaluateAnswer(
        currentQuestion.id,
        studentAnswer,
        currentQuestion.correctAnswer,
        currentQuestion.type
      );

      const result: QuizResult = {
        questionId: currentQuestion.id,
        studentAnswer,
        ...evaluation
      };

      setQuizResults(prev => [...prev, result]);

      // Log to session
      sessionManager.addQA({
        question: currentQuestion.question,
        answer: `Student: ${studentAnswer}\n\nCorrect: ${currentQuestion.correctAnswer}\n\nFeedback: ${evaluation.feedback}`,
        confidence: evaluation.score,
        questionIntent: 'quiz-question',
        sources: [{
          documentId: currentQuestion.documentId,
          relevance: 1.0,
          sourceText: currentQuestion.sourceChunk,
          section: currentQuestion.topic,
          documentType: 'quiz'
        }],
        documentNames: documents.map(doc => doc.name)
      });

      // Move to next question or complete quiz
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        toast.success(evaluation.feedback);
      } else {
        completeQuiz();
      }
    } catch (error) {
      console.error('Answer evaluation error:', error);
      toast.error('Failed to evaluate answer. Please try again.');
    }
  };

  // Complete quiz
  const completeQuiz = () => {
    setIsQuizActive(false);
    setIsQuizCompleted(true);
    
    const totalScore = quizResults.reduce((sum, result) => sum + result.score, 0);
    const percentage = Math.round((totalScore / quizQuestions.length) * 100);
    
    sessionManager.endSession();
    
    toast.success(`🎉 Quiz completed! Your score: ${percentage}%`);
  };

  // Reset quiz
  const resetQuiz = () => {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setStudentAnswers({});
    setQuizResults([]);
    setIsQuizActive(false);
    setIsQuizCompleted(false);
    setTimeElapsed(0);
    setQuizStartTime(null);
  };

  // Download quiz results
  const downloadResults = () => {
    try {
      sessionManager.downloadSession();
      toast.success('📥 Quiz results downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download quiz results');
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate quiz statistics
  const getQuizStats = () => {
    if (quizResults.length === 0) return null;
    
    const totalScore = quizResults.reduce((sum, result) => sum + result.score, 0);
    const percentage = Math.round((totalScore / quizResults.length) * 100);
    const correctAnswers = quizResults.filter(result => result.isCorrect).length;
    
    return {
      totalQuestions: quizResults.length,
      correctAnswers,
      percentage,
      totalScore: totalScore.toFixed(1)
    };
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = quizQuestions.length > 0 ? ((currentQuestionIndex + 1) / quizQuestions.length) * 100 : 0;
  const stats = getQuizStats();

  return (
    <Card className="flex flex-col h-[700px] bg-card-gradient border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">StudyMate Quiz</h3>
            <p className="text-xs text-muted-foreground">
              {documents.length > 0 ? `${documents.length} document(s) loaded` : 'No documents loaded'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isQuizActive && (
            <Badge variant="default" className="bg-green-600">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(timeElapsed)}
            </Badge>
          )}
          
          {!isQuizActive && !isQuizCompleted && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateQuiz(5)}
                disabled={isGenerating || documents.length === 0}
              >
                <Target className="w-3 h-3 mr-1" />
                Quick Quiz (5Q)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateQuiz(10)}
                disabled={isGenerating || documents.length === 0}
              >
                <Brain className="w-3 h-3 mr-1" />
                Full Quiz (10Q)
              </Button>
            </div>
          )}
          
          {quizQuestions.length > 0 && !isQuizActive && !isQuizCompleted && (
            <Button
              variant="default"
              size="sm"
              onClick={startQuiz}
            >
              <Play className="w-3 h-3 mr-1" />
              Start Quiz
            </Button>
          )}
          
          {isQuizCompleted && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadResults}
              >
                <Download className="w-3 h-3 mr-1" />
                Download Results
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetQuiz}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                New Quiz
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* No documents state */}
            {documents.length === 0 && (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Test Your Knowledge?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload your study materials first, then I'll generate personalized quiz questions 
                  to test your understanding of the content.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>📚 Upload PDFs of your notes or textbooks</p>
                  <p>🎯 Get questions generated from your content</p>
                  <p>📊 Track your performance and progress</p>
                  <p>📥 Download results for review</p>
                </div>
              </div>
            )}

            {/* Quiz generation state */}
            {documents.length > 0 && quizQuestions.length === 0 && !isGenerating && (
              <div className="text-center py-12">
                <Target className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generate Your Quiz</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  I'll analyze your uploaded documents and create personalized quiz questions 
                  to test your knowledge of the material.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => generateQuiz(5)} variant="outline">
                    <Target className="w-4 h-4 mr-2" />
                    Quick Quiz (5 Questions)
                  </Button>
                  <Button onClick={() => generateQuiz(10)}>
                    <Brain className="w-4 h-4 mr-2" />
                    Full Quiz (10 Questions)
                  </Button>
                </div>
              </div>
            )}

            {/* Generating state */}
            {isGenerating && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Generating Quiz Questions...</h3>
                <p className="text-muted-foreground">
                  Analyzing your documents and creating personalized questions
                </p>
              </div>
            )}

            {/* Quiz ready state */}
            {quizQuestions.length > 0 && !isQuizActive && !isQuizCompleted && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Quiz Ready!</h3>
                <p className="text-muted-foreground mb-6">
                  {quizQuestions.length} questions generated from your study materials
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {quizQuestions.filter(q => q.difficulty === 'easy').length}
                    </div>
                    <div className="text-muted-foreground">Easy</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-600">
                      {quizQuestions.filter(q => q.difficulty === 'medium').length}
                    </div>
                    <div className="text-muted-foreground">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">
                      {quizQuestions.filter(q => q.difficulty === 'hard').length}
                    </div>
                    <div className="text-muted-foreground">Hard</div>
                  </div>
                </div>
                <Button onClick={startQuiz} size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Start Quiz
                </Button>
              </div>
            )}

            {/* Active quiz */}
            {isQuizActive && currentQuestion && (
              <div className="space-y-6">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question */}
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant={
                      currentQuestion.difficulty === 'easy' ? 'secondary' :
                      currentQuestion.difficulty === 'medium' ? 'default' : 'destructive'
                    }>
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline">{currentQuestion.topic}</Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
                  
                  {/* Answer input based on question type */}
                  {currentQuestion.type === 'multiple-choice' && (
                    <div className="space-y-2">
                      {currentQuestion.options?.map((option, index) => (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={option}
                            checked={studentAnswers[currentQuestion.id] === option}
                            onChange={(e) => setStudentAnswers(prev => ({
                              ...prev,
                              [currentQuestion.id]: e.target.value
                            }))}
                            className="text-primary"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.type === 'true-false' && (
                    <div className="space-y-2">
                      {['True', 'False'].map((option) => (
                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={option}
                            checked={studentAnswers[currentQuestion.id] === option}
                            onChange={(e) => setStudentAnswers(prev => ({
                              ...prev,
                              [currentQuestion.id]: e.target.value
                            }))}
                            className="text-primary"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.type === 'short-answer' && (
                    <Input
                      placeholder="Type your answer here..."
                      value={studentAnswers[currentQuestion.id] || ''}
                      onChange={(e) => setStudentAnswers(prev => ({
                        ...prev,
                        [currentQuestion.id]: e.target.value
                      }))}
                      className="w-full"
                    />
                  )}
                  
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={submitAnswer}
                      disabled={!studentAnswers[currentQuestion.id]?.trim()}
                    >
                      {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Quiz completed */}
            {isQuizCompleted && stats && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Quiz Completed!</h3>
                <p className="text-muted-foreground mb-6">
                  Great job! Here are your results:
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{stats.percentage}%</div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.totalQuestions - stats.correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Incorrect</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{formatTime(timeElapsed)}</div>
                    <div className="text-sm text-muted-foreground">Time Taken</div>
                  </Card>
                </div>

                {/* Detailed results */}
                <div className="space-y-4 max-w-2xl mx-auto">
                  <h4 className="font-semibold text-left">Question Review:</h4>
                  {quizResults.map((result, index) => (
                    <Card key={result.questionId} className="p-4 text-left">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">Q{index + 1}. {quizQuestions[index]?.question}</span>
                        {result.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <div><strong>Your answer:</strong> {result.studentAnswer}</div>
                        <div><strong>Correct answer:</strong> {result.explanation}</div>
                        <div className="text-muted-foreground">{result.feedback}</div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center space-x-4 mt-8">
                  <Button onClick={downloadResults} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Results
                  </Button>
                  <Button onClick={resetQuiz}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Take Another Quiz
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
