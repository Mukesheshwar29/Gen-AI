import React, { useState } from 'react';
import { StudyMateHeader } from '@/components/StudyMateHeader';
import { PDFUpload } from '@/components/PDFUpload';
import { ChatInterface } from '@/components/ChatInterface';
import { QuizInterface } from '@/components/QuizInterface';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, MessageSquare, Brain, Zap, Target } from 'lucide-react';
import { SessionManager } from '@/services/SessionManager';

interface Document {
  id: string;
  name: string;
  content: string;
  status: string;
}

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [aiInitialized, setAiInitialized] = useState<boolean>(false);

  const handleFilesProcessed = (files: any[]) => {
    console.log('📄 Files processed callback received:', files);
    const newDocs = files.map(file => ({
      id: file.id,
      name: file.name,
      content: file.content,
      status: file.status
    }));

    setDocuments(prev => {
      const updated = [...prev, ...newDocs];
      console.log('📚 Documents state updated:', updated.length, 'total documents');
      return updated;
    });

    if (newDocs.length > 0) {
      setActiveTab('chat');
      toast.success('🎉 Documents ready! Ask questions to start learning.');
    }
  };

  const handleAIInitialized = (status: boolean) => {
    setAiInitialized(status);
  };

  const handleExportChat = () => {
    const sessionManager = SessionManager.getInstance();
    const currentSession = sessionManager.getCurrentSession();

    if (currentSession && currentSession.totalQuestions > 0) {
      try {
        sessionManager.downloadSession();
        toast.success('🎓 Viva session Q&A exported successfully!');
      } catch (error) {
        toast.error('Failed to export session history');
      }
    } else {
      toast.info('No active viva session to export. Start a viva session and ask questions first.');
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced language models analyze your documents and provide intelligent answers'
    },
    {
      icon: Zap,
      title: 'Instant Responses',
      description: 'Get immediate answers to your questions with real-time processing'
    },
    {
      icon: FileText,
      title: 'Multi-Document Support',
      description: 'Upload multiple PDFs and query across all your study materials'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <StudyMateHeader 
        documentCount={documents.length} 
        onExportChat={handleExportChat}
      />
      
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Upload Documents</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Quiz</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-8">
            <div className="max-w-4xl mx-auto">
              <PDFUpload 
                onFilesProcessed={handleFilesProcessed} 
                onAIInitialized={handleAIInitialized}
              />
              
              {documents.length === 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    How StudyMate Works
                  </h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                      <Card key={index} className="p-6 bg-card-gradient border-border/50 text-center">
                        <div className="w-12 h-12 rounded-lg bg-ai-gradient mx-auto mb-4 flex items-center justify-center">
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">{feature.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Document sidebar - only show if documents exist */}
                {documents.length > 0 && (
                  <Card className="lg:col-span-1 p-4 bg-card-gradient border-border/50 h-fit">
                    <h3 className="font-semibold mb-4">Your Documents</h3>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-primary mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <Badge variant="secondary" className="text-xs mt-1">
                                Ready
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('upload')}
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Add More Documents
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Chat interface - always show, adjust columns based on documents */}
                <div className={documents.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
                  <ChatInterface documents={documents} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quiz" className="space-y-8">
            <QuizInterface documents={documents} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
