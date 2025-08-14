import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Bot, User, Lightbulb, BookOpen, FileText, Zap, Brain, ChevronDown, ChevronUp, Quote, Download, Play, Square, BarChart3 } from 'lucide-react';
import { StudyMateAI } from '@/services/StudyMateAI';
import { SessionManager } from '@/services/SessionManager';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    documentId: string;
    relevance: number;
    sourceText?: string;
    section?: string;
    documentType?: string;
  }>;
  questionIntent?: string;
  confidence?: number;
  isResearchSynthesis?: boolean;
  crossDocumentInsights?: Array<{
    theme: string;
    documents: string[];
    excerpts: Array<{
      documentId: string;
      documentName: string;
      text: string;
      relevance: number;
      section?: string;
    }>;
    analysis: string;
  }>;
  documentCoverage?: Array<{
    documentId: string;
    documentName: string;
    relevantChunks: number;
    keyContributions: string[];
  }>;
};

interface ChatInterfaceProps {
  documents: Array<{ id: string; name: string; content: string; }>;
}

// Enhanced component for displaying source paragraphs with section info
const SourceParagraph: React.FC<{
  source: { documentId: string; relevance: number; sourceText?: string; section?: string; documentType?: string; };
  document: any;
  index: number;
}> = ({ source, document, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!source.sourceText) return null;

  // Determine document type icon
  const getDocumentTypeIcon = (type?: string) => {
    switch (type) {
      case 'textbook': return '📚';
      case 'lecture_notes': return '📝';
      case 'research_paper': return '📄';
      case 'assignment': return '📋';
      default: return '📖';
    }
  };

  return (
    <div className="mt-2 border border-border/30 rounded-lg bg-background/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center justify-between hover:bg-background/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Quote className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Source {index + 1}</span>
          <Badge variant="outline" className="text-xs">
            {getDocumentTypeIcon(source.documentType)} {document?.name || source.documentId}
          </Badge>
          {source.section && source.section !== 'Unknown' && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
              {source.section}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {(source.relevance * 100).toFixed(0)}% match
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="bg-muted/50 rounded p-3 text-sm italic border-l-4 border-primary/50">
            "{source.sourceText.trim()}"
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>From: {document?.name || 'Unknown document'}</span>
            {source.section && (
              <span>Section: {source.section}</span>
            )}
          </div>
          {source.documentType && (
            <p className="text-xs text-muted-foreground mt-1">
              Document type: {source.documentType.replace('_', ' ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ documents }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStats, setSessionStats] = useState({ totalQuestions: 0, averageConfidence: 0 });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sessionManager = SessionManager.getInstance();

  // Debug log to check if component is rendering
  console.log('💬 ChatInterface rendering with documents:', documents.length);
  console.log('📋 Documents received:', documents.map(d => ({ id: d.id, name: d.name })));

  // Get AI status
  const [aiStatus, setAiStatus] = useState({ initialized: true, modelsLoaded: 1, totalModels: 1 });

  useEffect(() => {
    const initializeAI = async () => {
      try {
        console.log('Initializing AI...');
        const ai = StudyMateAI.getInstance();
        await ai.initialize();
        const status = ai.getStatus();
        console.log('AI Status:', status);
        setAiStatus(status);
      } catch (error) {
        console.error('Failed to initialize AI:', error);
        setAiStatus({ initialized: true, modelsLoaded: 1, totalModels: 1 }); // Set as initialized to allow chat
      }
    };

    initializeAI();
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const currentSession = sessionManager.getCurrentSession();
    if (currentSession) {
      setIsSessionActive(true);
      updateSessionStats();
    }
  }, []);

  // Session management functions
  const startVivaSession = () => {
    const documentIds = documents.map(doc => doc.id);
    const sessionName = `Viva Prep - ${new Date().toLocaleDateString()}`;
    sessionManager.startSession(sessionName, documentIds);
    setIsSessionActive(true);
    updateSessionStats();
    toast.success('🎓 Viva preparation session started! All Q&As will be logged.');
  };

  const endVivaSession = () => {
    const endedSession = sessionManager.endSession();
    setIsSessionActive(false);
    updateSessionStats();
    if (endedSession) {
      toast.success(`📚 Session ended! ${endedSession.totalQuestions} questions answered.`);
    }
  };

  const downloadSessionHistory = () => {
    try {
      sessionManager.downloadSession();
      toast.success('📥 Session history downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download session history');
    }
  };

  const updateSessionStats = () => {
    const currentSession = sessionManager.getCurrentSession();
    if (currentSession) {
      setSessionStats({
        totalQuestions: currentSession.totalQuestions,
        averageConfidence: currentSession.averageConfidence
      });
    }
  };

  const suggestedQuestions = documents.length > 1 ? [
    // Multi-document research synthesis questions
    "What do these papers say about ensemble methods?",
    "What do these documents say about machine learning approaches?",
    "Compare the methodologies across these papers",
    "What are the common themes in these research papers?",
    "How do these studies approach the problem differently?",
    "What consensus emerges from these documents?",
    "Synthesize the key findings across all papers",
    "What complementary insights do these documents provide?",
    "How do the conclusions in these papers relate to each other?",
    "What research gaps are identified across these documents?"
  ] : documents.length === 1 ? [
    // Single document questions
    "What is principal component analysis?",
    "What is the use of sklearn in Python?",
    "Explain the concept of overfitting in machine learning",
    "Define supervised vs unsupervised learning",
    "What are the main algorithms discussed in this document?",
    "How do neural networks work according to this material?",
    "What are the key advantages and disadvantages mentioned?",
    "Explain the methodology described in the document",
    "What examples are provided to illustrate these concepts?",
    "Summarize the main conclusions from this study material"
  ] : [
    // General study questions when no documents
    "What is overfitting in machine learning?",
    "Explain the difference between classification and regression",
    "Define supervised learning",
    "What are neural networks?",
    "Help me understand principal component analysis",
    "What is the use of sklearn in Python?"
  ];

  // Real AI response using HuggingFace models
  const generateAIResponse = async (question: string): Promise<{
    answer: string;
    sources: Array<{
      documentId: string;
      relevance: number;
      sourceText?: string;
      section?: string;
      documentType?: string;
    }>;
    questionIntent: string;
    confidence: number;
  }> => {
    const ai = StudyMateAI.getInstance();
    const documentIds = documents.map(doc => doc.id);
    
    try {
      const result = await ai.generateAnswer(question, documentIds);
      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };

  const typeMessage = async (response: {
    answer: string;
    sources: Array<{
      documentId: string;
      relevance: number;
      sourceText?: string;
      section?: string;
      documentType?: string;
    }>;
    questionIntent: string;
    confidence: number;
  }) => {
    setIsTyping(true);
    const messageId = Math.random().toString(36).substr(2, 9);
    
    // Add empty message first
    setMessages(prev => [...prev, {
      id: messageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      sources: response.sources,
      questionIntent: response.questionIntent,
      confidence: response.confidence
    }]);

    // Type message character by character
    const message = response.answer;
    for (let i = 0; i <= message.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: message.slice(0, i) }
          : msg
      ));
    }
    
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (documents.length === 0) {
      toast.error('Please upload PDF documents first');
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await generateAIResponse(inputValue);
      await typeMessage(response);

      // Log Q&A to session if active
      if (isSessionActive) {
        sessionManager.addQA({
          question: inputValue,
          answer: response.answer,
          confidence: response.confidence,
          questionIntent: response.questionIntent,
          sources: response.sources,
          documentNames: documents.map(doc => doc.name)
        });
        updateSessionStats();
      }

      // Show confidence indicator
      if (response.confidence < 0.7) {
        toast('💡 Consider asking more specific questions for better answers', {
          description: 'Try referencing specific topics from your documents'
        });
      }
    } catch (error) {
      console.error('Failed to generate response:', error);
      toast.error('Failed to process your question. Please try again.');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your question right now. Please ensure your documents are properly uploaded and try asking again.",
        timestamp: new Date(),
        confidence: 0
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-[700px] bg-card-gradient border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-ai-gradient flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">StudyMate AI</h3>
            <p className="text-sm text-muted-foreground">
              {documents.length > 0
                ? `${documents.length} document${documents.length !== 1 ? 's' : ''} loaded • Ready to help`
                : 'Your AI study assistant • Ready to help'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {aiStatus.initialized ? '🟢 Online' : '🟡 Initializing...'}
          </Badge>

          {/* Viva Session Controls */}
          {documents.length > 0 && (
            <div className="flex items-center space-x-2">
              {!isSessionActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startVivaSession}
                  className="text-xs h-7 px-2"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start Viva Prep
                </Button>
              ) : (
                <>
                  <Badge variant="default" className="text-xs bg-green-600">
                    🎓 Viva Active
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endVivaSession}
                    className="text-xs h-7 px-2"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    End Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSessionHistory}
                    className="text-xs h-7 px-2"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export Q&A
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-ai-gradient flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Hello! I'm StudyMate AI</h4>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {documents.length > 1
                  ? `I'm ready to help with research synthesis across your ${documents.length} documents. Ask me to compare, analyze, or synthesize information across your papers!`
                  : documents.length === 1
                  ? "I'm ready to help you understand your study material. Ask me anything about your uploaded document!"
                  : "I'm your AI study assistant. Upload some documents or ask me general study questions to get started!"
                }
              </p>

              {/* Session Statistics */}
              {isSessionActive && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Questions: {sessionStats.totalQuestions}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Avg Confidence: {(sessionStats.averageConfidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-center mt-2 text-green-700 dark:text-green-300">
                    🎓 Viva preparation session active - All Q&As are being logged
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {documents.length > 1
                    ? (isSessionActive ? "Research synthesis questions for viva practice:" : "Try these cross-document research questions:")
                    : documents.length === 1
                    ? (isSessionActive ? "Viva-style questions to practice:" : "Try asking about your document:")
                    : "Example questions to get started:"
                  }
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
                  {suggestedQuestions.slice(0, 6).map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-left justify-start h-auto p-4 hover:bg-primary/5 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{question}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-ai-gradient flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${
                message.type === 'user' ? 'order-first' : ''
              }`}>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-background/50 border border-border/50'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Research synthesis insights */}
                  {message.isResearchSynthesis && message.crossDocumentInsights && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-600">Cross-Document Research Insights</span>
                      </div>

                      {message.crossDocumentInsights.map((insight, index) => (
                        <div key={index} className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm text-purple-800 dark:text-purple-200">
                              {insight.theme}
                            </h4>
                            <Badge variant="outline" className="text-xs border-purple-300">
                              {insight.documents.length} docs
                            </Badge>
                          </div>

                          <div className="text-xs text-purple-700 dark:text-purple-300 whitespace-pre-wrap mb-2">
                            {insight.analysis}
                          </div>

                          <div className="space-y-1">
                            {insight.excerpts.slice(0, 2).map((excerpt, excerptIndex) => (
                              <div key={excerptIndex} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border">
                                <div className="font-medium text-purple-600 mb-1">
                                  {excerpt.documentName}
                                </div>
                                <div className="text-gray-600 dark:text-gray-300">
                                  "{excerpt.text}"
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document coverage for research synthesis */}
                  {message.isResearchSynthesis && message.documentCoverage && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Document Coverage Analysis</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {message.documentCoverage.map((doc, index) => (
                          <div key={index} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                {doc.documentName}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {doc.relevantChunks} chunks
                              </Badge>
                            </div>

                            {doc.keyContributions.length > 0 && (
                              <div className="space-y-1">
                                {doc.keyContributions.slice(0, 2).map((contribution, contribIndex) => (
                                  <div key={contribIndex} className="text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 rounded p-1">
                                    "{contribution}"
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced source display with paragraphs */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {/* Quick source badges */}
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, index) => {
                          const doc = documents.find(d => d.id === source.documentId);
                          return (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {doc?.name || source.documentId}
                              <span className="ml-1 text-primary">
                                ({(source.relevance * 100).toFixed(0)}%)
                              </span>
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Source paragraphs for verification */}
                      {message.sources.some(s => s.sourceText) && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center">
                            <Quote className="w-3 h-3 mr-1" />
                            Source paragraphs for verification:
                          </p>
                          {message.sources
                            .filter(source => source.sourceText)
                            .map((source, index) => {
                              const doc = documents.find(d => d.id === source.documentId);
                              return (
                                <SourceParagraph
                                  key={index}
                                  source={source}
                                  document={doc}
                                  index={index}
                                />
                              );
                            })}
                        </div>
                      )}

                      {/* Question intent and confidence indicators */}
                      {message.questionIntent && (
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Brain className="w-3 h-3" />
                          <span>Intent: {message.questionIntent}</span>
                          {message.confidence !== undefined && (
                            <>
                              <span>•</span>
                              <span className={`flex items-center space-x-1 ${
                                message.confidence > 0.8 ? 'text-green-400' :
                                message.confidence > 0.6 ? 'text-yellow-400' : 'text-orange-400'
                              }`}>
                                <Zap className="w-3 h-3" />
                                <span>Confidence: {(message.confidence * 100).toFixed(0)}%</span>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-1 px-3">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-ai-gradient flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-background/50 border border-border/50 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="flex space-x-3 items-end">
          <div className="flex-1 relative">
            <Input
              placeholder={documents.length > 1
                ? (isSessionActive
                    ? "Ask a research synthesis question (will be logged)..."
                    : "Ask me to compare or synthesize across your documents...")
                : documents.length === 1
                ? (isSessionActive
                    ? "Ask a viva question (will be logged for export)..."
                    : "Ask me anything about your document...")
                : "Ask me a study question or upload documents first..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 min-h-[44px] pr-12 resize-none border-border/50 focus:border-primary/50 bg-background"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            variant="ai"
            size="lg"
            className="h-[44px] px-4"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Helpful hint */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {documents.length > 1
            ? (isSessionActive
                ? `🔬 Research session active • ${sessionStats.totalQuestions} questions answered • Cross-document analysis enabled`
                : `StudyMate can synthesize information across your ${documents.length} uploaded documents`)
            : documents.length === 1
            ? (isSessionActive
                ? `🎓 Viva session active • ${sessionStats.totalQuestions} questions answered • All Q&As logged`
                : `StudyMate can answer questions about your uploaded document`)
            : "Upload PDF documents to get answers grounded in your study materials"
          }
        </div>
      </div>
    </Card>
  );
};