import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Download, Settings, Sparkles } from 'lucide-react';

interface StudyMateHeaderProps {
  documentCount: number;
  onExportChat: () => void;
}

export const StudyMateHeader: React.FC<StudyMateHeaderProps> = ({ 
  documentCount, 
  onExportChat 
}) => {
  return (
    <header className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary-glow/20"></div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-ai-gradient flex items-center justify-center shadow-glow">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-primary-glow bg-clip-text text-transparent">
                StudyMate
              </h1>
              <p className="text-lg text-foreground/80 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered PDF Study Assistant</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {documentCount > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {documentCount} Document{documentCount !== 1 ? 's' : ''} Loaded
              </Badge>
            )}
            
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportChat}
              className="border-white/20 text-foreground hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Chat
            </Button>
          </div>
        </div>
        
        <div className="mt-8 max-w-2xl">
          <p className="text-foreground/70 text-lg leading-relaxed">
            Upload your study materials and ask questions to get instant, contextual answers.
            Perfect for viva preparation, exam practice, research, and understanding complex topics.
            Start a viva session to log all Q&As for export and revision.
          </p>
        </div>
      </div>
    </header>
  );
};