import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, X, Check, Brain, Zap } from 'lucide-react';
import { StudyMateAI } from '@/services/StudyMateAI';
import { AdvancedPDFProcessor } from '@/services/PDFProcessor';

interface PDFFile {
  id: string;
  name: string;
  size: number;
  content: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error';
  progress: number;
  metadata?: {
    pages: number;
    processingMethod: string;
    extractionQuality: 'high' | 'medium' | 'low';
    topics?: string[];
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    keywords?: string[];
  };
}

interface PDFUploadProps {
  onFilesProcessed: (files: PDFFile[]) => void;
  onAIInitialized?: (status: boolean) => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({ onFilesProcessed, onAIInitialized }) => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [aiStatus, setAiStatus] = useState<{ initialized: boolean; modelsLoaded: number; totalModels: number }>({
    initialized: false,
    modelsLoaded: 0,
    totalModels: 4
  });

  // Initialize AI models on component mount
  React.useEffect(() => {
    const initializeAI = async () => {
      try {
        const ai = StudyMateAI.getInstance();
        await ai.initialize();
        const status = ai.getStatus();
        setAiStatus(status);
        onAIInitialized?.(status.initialized);
        toast.success('🤖 AI models loaded successfully!');
      } catch (error) {
        console.error('Failed to initialize AI:', error);
        toast.error('Failed to load AI models. Some features may be limited.');
      }
    };

    initializeAI();
  }, [onAIInitialized]);

  const processFile = async (file: File): Promise<{ content: string; metadata: any }> => {
    const pdfProcessor = AdvancedPDFProcessor.getInstance();
    const ai = StudyMateAI.getInstance();
    
    // Extract text from PDF
    const { text, metadata } = await pdfProcessor.extractTextFromPDF(file);
    
    // Preprocess the text
    const { cleanedText, sections, keywords } = pdfProcessor.preprocessText(text);
    
    // Analyze document with AI (if available)
    let analysisResult = null;
    if (aiStatus.initialized) {
      try {
        analysisResult = await ai.analyzeDocument(cleanedText);
      } catch (error) {
        console.warn('Document analysis failed:', error);
      }
    }
    
    return {
      content: cleanedText,
      metadata: {
        ...metadata,
        topics: analysisResult?.topics || [],
        complexity: analysisResult?.complexity || 'intermediate',
        keywords: keywords.slice(0, 10),
        sections: sections.length
      }
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: PDFFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      content: '',
      status: 'uploading',
      progress: 0,
      metadata: undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (const [index, file] of acceptedFiles.entries()) {
      const fileId = newFiles[index].id;
      
      try {
        // Step 1: Upload simulation
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'uploading', progress: 25 } : f
        ));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 2: PDF Processing
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing', progress: 50 } : f
        ));

        const { content, metadata } = await processFile(file);

        // Step 3: AI Analysis
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'analyzing', progress: 75 } : f
        ));

        // Process with AI for embeddings with enhanced metadata
        if (aiStatus.initialized) {
          const ai = StudyMateAI.getInstance();
          await ai.processDocument(fileId, content, {
            name: file.name,
            size: file.size,
            type: file.type,
            ...metadata
          });
        }

        // Step 4: Complete
        setFiles(prev => {
          const updatedFiles = prev.map(f =>
            f.id === fileId ? {
              ...f,
              content,
              metadata,
              status: 'completed',
              progress: 100
            } : f
          );

          // Call the callback immediately when file is completed
          const completedFile = updatedFiles.find(f => f.id === fileId);
          if (completedFile && completedFile.status === 'completed') {
            setTimeout(() => onFilesProcessed([completedFile]), 100);
          }

          return updatedFiles;
        });

        toast.success(`✅ Successfully processed ${file.name}`);
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
        ));
        toast.error(`❌ Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

  }, [files, onFilesProcessed, aiStatus.initialized]);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  return (
    <div className="space-y-4">
      {/* AI Status Card */}
      <Card className="p-4 bg-card-gradient border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              aiStatus.initialized ? 'bg-success-gradient' : 'bg-muted'
            }`}>
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium">AI Processing Engine</h4>
              <p className="text-sm text-muted-foreground">
                {aiStatus.initialized 
                  ? '🟢 Ready - All models loaded' 
                  : `🔄 Loading models... (${aiStatus.modelsLoaded}/${aiStatus.totalModels})`}
              </p>
            </div>
          </div>
          {aiStatus.initialized && (
            <Badge variant="secondary" className="bg-success-gradient text-white">
              <Zap className="w-3 h-3 mr-1" />
              WebGPU Accelerated
            </Badge>
          )}
        </div>
      </Card>

      <Card className="p-8 bg-card-gradient border-border/50">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-smooth ${
            isDragActive 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Your Study Materials</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop PDF files here, or click to select files
          </p>
          <Button variant="upload">
            Select PDF Files
          </Button>
        </div>
      </Card>

      {files.length > 0 && (
        <Card className="p-6 bg-card-gradient border-border/50">
          <h4 className="font-semibold mb-4">Processing Files</h4>
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center space-x-3 p-4 rounded-lg bg-background/50 border border-border/30">
                <div className="flex-shrink-0">
                  {file.status === 'completed' ? (
                    <div className="w-10 h-10 rounded-full bg-success-gradient flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  ) : file.status === 'error' ? (
                    <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
                      <X className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ai-gradient flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={file.status === 'completed' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {file.status === 'uploading' && '📤 Uploading'}
                      {file.status === 'processing' && '🔄 Extracting Text'}
                      {file.status === 'analyzing' && '🧠 AI Analysis'}
                      {file.status === 'completed' && '✅ Ready'}
                      {file.status === 'error' && '❌ Error'}
                    </Badge>
                    
                    {file.metadata?.extractionQuality && (
                      <Badge variant="outline" className="text-xs">
                        {file.metadata.extractionQuality} quality
                      </Badge>
                    )}
                  </div>

                  {file.status !== 'completed' && file.status !== 'error' && (
                    <Progress value={file.progress} className="h-2" />
                  )}

                  {file.metadata && file.status === 'completed' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>📄 {file.metadata.pages} pages</span>
                        <span>•</span>
                        <span>🔧 {file.metadata.processingMethod}</span>
                        {file.metadata.complexity && (
                          <>
                            <span>•</span>
                            <span>📊 {file.metadata.complexity}</span>
                          </>
                        )}
                      </div>
                      
                      {file.metadata.topics && file.metadata.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.metadata.topics.slice(0, 3).map((topic: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};