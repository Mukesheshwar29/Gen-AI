// Advanced AI service using Hugging Face API with fallback support
export class StudyMateAI {
  private static instance: StudyMateAI;
  private apiKey: string;
  private isInitialized = false;
  private demoMode = false;
  private documentEmbeddings: Map<string, { chunks: string[], embeddings: number[][], metadata: any }> = new Map();
  private documentMetadata: Map<string, { name: string, type: string, sections: any[], keywords: string[] }> = new Map();
  private readonly API_BASE = 'https://api-inference.huggingface.co/models';

  private constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Hugging Face API key not found. Please set VITE_HUGGINGFACE_API_KEY in your .env file');
    }
  }

  static getInstance(): StudyMateAI {
    if (!StudyMateAI.instance) {
      StudyMateAI.instance = new StudyMateAI();
    }
    return StudyMateAI.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing StudyMate AI...');

      if (!this.apiKey) {
        console.warn('⚠️ No API key found, enabling demo mode');
        this.demoMode = true;
        this.isInitialized = true;
        console.log('✅ AI service initialized in demo mode!');
        return;
      }

      // Test API connection with timeout and retry
      try {
        await this.testAPIConnection();
        console.log('✅ AI service initialized successfully with Hugging Face API!');
      } catch (apiError) {
        console.warn('⚠️ API connection failed, enabling demo mode:', apiError);
        this.demoMode = true;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize AI service:', error);
      // Don't throw error, use fallback mode instead
      this.isInitialized = true;
      console.log('✅ AI service initialized in fallback mode!');
    }
  }

  private async testAPIConnection(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.API_BASE}/gpt2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: "Hello",
          parameters: { max_length: 10, return_full_text: false }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API test failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ Hugging Face API connection successful');
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      throw error;
    }
  }

  // API-based text generation with fallback
  private async generateTextWithAPI(prompt: string, maxLength: number = 150): Promise<string> {
    // If in demo mode or no API key, use fallback immediately
    if (this.demoMode || !this.apiKey) {
      return this.generateFallbackText(prompt);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${this.API_BASE}/microsoft/DialoGPT-medium`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: maxLength,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`API request failed: ${response.status}, using fallback`);
        return this.generateFallbackText(prompt);
      }

      const result = await response.json();
      return result[0]?.generated_text || this.generateFallbackText(prompt);
    } catch (error) {
      console.warn('Text generation API error, using fallback:', error);
      return this.generateFallbackText(prompt);
    }
  }

  // Enhanced fallback text generation strictly grounded in student materials
  private generateFallbackText(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    // Extract context from prompt if available
    const contextMatch = prompt.match(/Context:(.*?)(?:Question:|$)/s);
    const context = contextMatch ? contextMatch[1].trim() : '';

    // Always prioritize context from student's materials
    if (context && context.length > 50) {
      return this.generateContextBasedAnswer(lowerPrompt, context);
    }

    // If no context but we have general knowledge questions, provide helpful responses
    if (this.documentEmbeddings.size === 0) {
      return this.generateGeneralStudyResponse(lowerPrompt);
    }

    // Fallback responses that encourage using uploaded materials
    if (lowerPrompt.includes('overfitting')) {
      return "I can help explain overfitting, but I'd like to provide an answer based on your specific textbook or course materials. Please upload your machine learning textbook or lecture notes for a more accurate explanation that matches your curriculum.";
    } else if (lowerPrompt.includes('neural network')) {
      return "Neural networks are an important topic in machine learning. For the most accurate explanation that matches your course, please upload your textbook or lecture materials so I can provide definitions and examples directly from your study materials.";
    } else if (lowerPrompt.includes('classification') && lowerPrompt.includes('regression')) {
      return "The difference between classification and regression is a fundamental concept. I can provide a better explanation if you upload your machine learning textbook or course materials, so I can give you the exact definitions and examples from your curriculum.";
    } else {
      return "I'd like to help answer your question using your specific study materials. Please upload your textbooks, lecture notes, or other course materials as PDF files so I can provide answers that are directly grounded in your curriculum and learning resources.";
    }
  }

  // Generate answers strictly based on provided context
  private generateContextBasedAnswer(question: string, context: string): string {
    const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (question.includes('summary') || question.includes('summarize')) {
      const keySentences = sentences.slice(0, 3).join('. ').trim();
      return `Based on your materials: ${keySentences}. This summary captures the main points discussed in your textbook/notes.`;
    } else if (question.includes('explain') || question.includes('what is')) {
      const definition = sentences.find(s => s.toLowerCase().includes('is') || s.toLowerCase().includes('are')) || sentences[0];
      const examples = sentences.filter(s => s.toLowerCase().includes('example') || s.toLowerCase().includes('such as'));

      let answer = `According to your study materials: ${definition.trim()}.`;
      if (examples.length > 0) {
        answer += ` ${examples[0].trim()}.`;
      }
      return answer;
    } else if (question.includes('difference') || question.includes('compare')) {
      const comparisons = sentences.filter(s =>
        s.toLowerCase().includes('while') ||
        s.toLowerCase().includes('whereas') ||
        s.toLowerCase().includes('unlike') ||
        s.toLowerCase().includes('different')
      );

      if (comparisons.length > 0) {
        return `From your materials: ${comparisons.join(' ').trim()}`;
      } else {
        return `Based on your study materials: ${sentences.slice(0, 2).join('. ').trim()}. This explains the key distinctions mentioned in your textbook.`;
      }
    } else {
      // General answer based on context
      const relevantSentences = sentences.slice(0, 2).join('. ').trim();
      return `According to your study materials: ${relevantSentences}. This information comes directly from your uploaded textbook/notes.`;
    }
  }

  // API-based embeddings with fallback
  private async getEmbeddingsWithAPI(text: string): Promise<number[]> {
    // If in demo mode or no API key, use fallback immediately
    if (this.demoMode || !this.apiKey) {
      return this.generateFallbackEmbedding(text);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.API_BASE}/sentence-transformers/all-MiniLM-L6-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Embeddings API failed: ${response.status}, using fallback`);
        return this.generateFallbackEmbedding(text);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : this.generateFallbackEmbedding(text);
    } catch (error) {
      console.warn('Embeddings API error, using fallback:', error);
      return this.generateFallbackEmbedding(text);
    }
  }

  // Simple fallback embedding based on text characteristics
  private generateFallbackEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Standard embedding size

    // Simple hash-based embedding generation
    for (let i = 0; i < words.length && i < 100; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      const index = Math.abs(hash) % 384;
      embedding[index] += 1 / (words.length + 1);
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  // Advanced text chunking with overlap for better context
  private chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) chunks.push(chunk.trim());
    }
    
    return chunks;
  }

  // Enhanced document processing with metadata tracking
  async processDocument(documentId: string, content: string, metadata?: any): Promise<void> {
    if (!this.isInitialized) throw new Error('AI service not initialized');

    console.log(`🔄 Processing document: ${documentId}`);
    console.log(`📄 Content length: ${content.length} characters`);

    // Store document metadata for better grounding
    this.documentMetadata.set(documentId, {
      name: metadata?.name || documentId,
      type: this.detectDocumentType(content),
      sections: this.extractSections(content),
      keywords: this.extractKeywords(content)
    });

    // Enhanced text chunking with section awareness
    const chunks = this.createSmartChunks(content);
    console.log(`📝 Created ${chunks.length} chunks from document`);

    // Generate embeddings for each chunk
    const embeddings: number[][] = [];
    const chunkMetadata: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await this.getEmbeddingsWithAPI(chunk);
        embeddings.push(embedding);

        // Store chunk metadata for better source tracking
        chunkMetadata.push({
          index: i,
          section: this.findChunkSection(chunk, content),
          keywords: this.extractKeywords(chunk).slice(0, 5)
        });
      } catch (error) {
        console.error('Error generating embedding for chunk:', error);
        embeddings.push(new Array(384).fill(0));
        chunkMetadata.push({ index: i, section: 'unknown', keywords: [] });
      }
    }

    this.documentEmbeddings.set(documentId, {
      chunks,
      embeddings,
      metadata: {
        chunkMetadata,
        documentType: this.detectDocumentType(content),
        totalSections: this.extractSections(content).length
      }
    });

    console.log(`✅ Processed ${chunks.length} chunks for document ${documentId} (${this.detectDocumentType(content)})`);
    console.log(`📊 Document embeddings stored. Total documents: ${this.documentEmbeddings.size}`);
  }

  // Enhanced semantic search with strict grounding in student materials
  private async semanticSearch(query: string, topK: number = 8): Promise<Array<{
    chunk: string,
    score: number,
    documentId: string,
    section?: string,
    chunkIndex?: number,
    documentType?: string
  }>> {
    if (!this.isInitialized) throw new Error('AI service not initialized');

    // Generate query embedding using API
    const queryVector = await this.getEmbeddingsWithAPI(query);

    const results: Array<{
      chunk: string,
      score: number,
      documentId: string,
      section?: string,
      chunkIndex?: number,
      documentType?: string
    }> = [];

    // Enhanced search across all documents with metadata
    for (const [docId, docData] of this.documentEmbeddings.entries()) {
      const docMetadata = this.documentMetadata.get(docId);

      for (let i = 0; i < docData.chunks.length; i++) {
        const similarity = this.cosineSimilarity(queryVector, docData.embeddings[i]);

        // Enhanced scoring based on document type and content relevance
        let adjustedScore = similarity;

        // Boost textbook content for academic queries
        if (docMetadata?.type === 'textbook') {
          adjustedScore *= 1.2;
        }

        // Boost chunks that contain exact keyword matches
        const queryKeywords = this.extractKeywords(query.toLowerCase());
        const chunkKeywords = this.extractKeywords(docData.chunks[i].toLowerCase());
        const keywordOverlap = queryKeywords.filter(k => chunkKeywords.includes(k)).length;
        if (keywordOverlap > 0) {
          adjustedScore *= (1 + keywordOverlap * 0.1);
        }

        results.push({
          chunk: docData.chunks[i],
          score: adjustedScore,
          documentId: docId,
          section: docData.metadata?.chunkMetadata?.[i]?.section || 'Unknown',
          chunkIndex: i,
          documentType: docMetadata?.type || 'unknown'
        });
      }
    }

    // Sort by relevance and return top results with higher threshold for quality
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(result => result.score > 0.25); // Slightly lower threshold but with enhanced scoring
  }

  // Cosine similarity calculation
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Classify question intent for better response generation
  private async classifyQuestionIntent(question: string): Promise<string> {
    try {
      // Simple rule-based classification for now
      const lowerQuestion = question.toLowerCase();

      if (lowerQuestion.includes('what is') || lowerQuestion.includes('define')) {
        return 'definition';
      } else if (lowerQuestion.includes('how') || lowerQuestion.includes('explain')) {
        return 'explanation';
      } else if (lowerQuestion.includes('summarize') || lowerQuestion.includes('summary')) {
        return 'summary';
      } else if (lowerQuestion.includes('compare') || lowerQuestion.includes('difference')) {
        return 'comparison';
      } else if (lowerQuestion.includes('example') || lowerQuestion.includes('instance')) {
        return 'example';
      } else {
        return 'general';
      }
    } catch (error) {
      console.error('Question classification error:', error);
      return 'general';
    }
  }

  // Enhanced context preparation with question intent
  private prepareEnhancedContext(
    relevantChunks: Array<{chunk: string, score: number, documentId: string}>,
    questionIntent: string,
    originalQuestion: string
  ): string {
    const contextChunks = relevantChunks.map(item => 
      `[Source: ${item.documentId}, Relevance: ${(item.score * 100).toFixed(1)}%]\n${item.chunk}`
    ).join('\n\n---\n\n');

    const intentPrompts = {
      definition: "Provide a clear, concise definition based on the context.",
      explanation: "Explain the concept thoroughly using the provided information.",
      summary: "Summarize the key points from the relevant content.",
      comparison: "Compare and contrast the elements mentioned in the context.",
      example: "Provide specific examples from the source material.",
      procedure: "Outline the steps or process described in the context.",
      analysis: "Analyze the information and provide insights.",
      evaluation: "Evaluate and assess the information critically."
    };

    const intentPrompt = intentPrompts[questionIntent as keyof typeof intentPrompts] || 
                        "Answer the question comprehensively using the context.";

    return `Context Information:
${contextChunks}

Question Intent: ${questionIntent}
Instruction: ${intentPrompt}

Question: ${originalQuestion}

Please provide a comprehensive answer based on the context above. Include specific references to the source material and ensure accuracy.`;
  }

  // Main answer generation with advanced RAG
  async generateAnswer(question: string, documentIds: string[]): Promise<{
    answer: string;
    sources: Array<{
      documentId: string,
      relevance: number,
      sourceText?: string,
      section?: string,
      documentType?: string
    }>;
    questionIntent: string;
    confidence: number;
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
  }> {
    if (!this.isInitialized) {
      throw new Error('AI models not initialized. Call initialize() first.');
    }

    console.log('🤖 Generating AI answer...');

    // Step 1: Classify question intent
    const questionIntent = await this.classifyQuestionIntent(question);
    console.log(`📋 Question intent: ${questionIntent}`);

    // Check if this is a research synthesis question (multiple documents + research language)
    const isResearchQuestion = this.isResearchSynthesisQuestion(question, documentIds);

    if (isResearchQuestion && documentIds.length >= 2) {
      console.log('🔬 Detected research synthesis question - generating cross-document analysis...');

      try {
        const synthesis = await this.generateResearchSynthesis(question, documentIds);

        // Convert synthesis to standard format
        const sources = synthesis.documentCoverage.map(doc => ({
          documentId: doc.documentId,
          relevance: doc.relevantChunks > 0 ? 0.8 : 0.5,
          sourceText: doc.keyContributions.join(' '),
          section: 'Research Synthesis',
          documentType: 'research_compilation'
        }));

        return {
          answer: synthesis.synthesis,
          sources,
          questionIntent: 'research_synthesis',
          confidence: synthesis.confidence,
          isResearchSynthesis: true,
          crossDocumentInsights: synthesis.crossDocumentInsights,
          documentCoverage: synthesis.documentCoverage
        };
      } catch (error) {
        console.warn('Research synthesis failed, falling back to standard search:', error);
        // Fall through to standard processing
      }
    }

    // Step 2: Semantic search for relevant content
    console.log(`🔍 Searching through ${this.documentEmbeddings.size} documents...`);
    const relevantChunks = await this.semanticSearch(question, 8);
    console.log(`📋 Found ${relevantChunks.length} relevant chunks`);

    if (relevantChunks.length === 0) {
      // Try a simpler keyword-based search as fallback
      const keywordChunks = this.keywordSearch(question);
      console.log(`🔍 Keyword search found ${keywordChunks.length} chunks`);

      if (keywordChunks.length === 0) {
        return {
          answer: `I couldn't find relevant information in your ${this.documentEmbeddings.size} uploaded document(s) to answer this question. Please try rephrasing or asking about content that's available in your uploaded materials.`,
          sources: [],
          questionIntent,
          confidence: 0
        };
      }

      // Use keyword search results
      return this.generateAnswerFromChunks(keywordChunks, question, questionIntent);
    }

    // Step 3: Prepare enhanced context
    const enhancedContext = this.prepareEnhancedContext(relevantChunks, questionIntent, question);

    // Step 4: Generate answer using the API
    try {
      const generatedText = await this.generateTextWithAPI(enhancedContext, 300);

      // Clean up the response
      const answer = generatedText
        .trim()
        .substring(0, 1000) // Limit response length
        .replace(/\[Source:.*?\]/g, '') // Remove source markers from answer
        .trim();

      // Calculate confidence based on relevance scores
      const avgRelevance = relevantChunks.reduce((sum, chunk) => sum + chunk.score, 0) / relevantChunks.length;
      const confidence = Math.min(avgRelevance * 1.2, 1.0);

      // Prepare enhanced sources information with metadata
      const sources = relevantChunks.slice(0, 3).map(chunk => ({
        documentId: chunk.documentId,
        relevance: chunk.score,
        sourceText: chunk.chunk,
        section: (chunk as any).section || 'General Content',
        documentType: (chunk as any).documentType || 'study_material'
      }));

      console.log('✅ Answer generated successfully');

      return {
        answer: answer || "I understand your question, but I need more specific information from your documents to provide a comprehensive answer.",
        sources,
        questionIntent,
        confidence
      };

    } catch (error) {
      console.error('Text generation error:', error);
      
      // Fallback response with extracted information
      const fallbackAnswer = this.generateFallbackAnswer(relevantChunks, question);
      
      return {
        answer: fallbackAnswer,
        sources: relevantChunks.slice(0, 3).map(chunk => ({
          documentId: chunk.documentId,
          relevance: chunk.score,
          sourceText: chunk.chunk,
          section: (chunk as any).section || 'General Content',
          documentType: (chunk as any).documentType || 'study_material'
        })),
        questionIntent,
        confidence: 0.6
      };
    }
  }

  // Fallback answer generation using template-based approach
  private generateFallbackAnswer(
    relevantChunks: Array<{chunk: string, score: number, documentId: string}>,
    question: string
  ): string {
    if (relevantChunks.length === 0) {
      return "I couldn't find relevant information to answer your question.";
    }

    const topChunk = relevantChunks[0];
    const additionalInfo = relevantChunks.length > 1 ? 
      ` Additional relevant information can be found across ${relevantChunks.length - 1} other sections of your documents.` : '';

    return `Based on your study materials, here's what I found: ${topChunk.chunk.substring(0, 300)}...${additionalInfo}`;
  }

  // Get AI status for UI
  getStatus(): { initialized: boolean; modelsLoaded: number; totalModels: number } {
    return {
      initialized: this.isInitialized,
      modelsLoaded: this.isInitialized ? 1 : 0,
      totalModels: 1
    };
  }

  // Advanced document analysis
  async analyzeDocument(content: string): Promise<{
    summary: string;
    topics: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced';
    suggestedQuestions: string[];
  }> {
    if (!this.isInitialized) throw new Error('AI service not initialized');

    try {
      // Simple topic extraction based on keywords
      const topics = this.extractTopics(content);

      // Generate summary using API
      const summary = await this.generateTextWithAPI(
        `Please provide a brief summary of the following text:\n\n${content.substring(0, 1000)}...`,
        150
      );

      // Analyze complexity
      const complexityIndicators = content.match(/\b(theorem|hypothesis|algorithm|methodology|analysis)\b/gi)?.length || 0;
      const complexity = complexityIndicators > 5 ? 'advanced' : 
                        complexityIndicators > 2 ? 'intermediate' : 'beginner';

      // Generate suggested questions
      const suggestedQuestions = [
        `What are the main concepts discussed in this ${topics[0]} material?`,
        `Can you explain the key ${topics[0]} principles mentioned?`,
        `What examples are provided to illustrate these concepts?`,
        `How does this relate to fundamental ${topics[0]} theory?`
      ];

      const fallbackSummary = content.substring(0, 200) + '...';

      return { summary, topics, complexity, suggestedQuestions };
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        summary: 'Document analysis unavailable',
        topics: ['general'],
        complexity: 'intermediate',
        suggestedQuestions: ['What are the main points in this document?']
      };
    }
  }

  // Simple topic extraction based on keywords
  private extractTopics(content: string): string[] {
    const topicKeywords = {
      'mathematics': ['equation', 'formula', 'theorem', 'proof', 'calculate', 'algebra', 'geometry'],
      'science': ['experiment', 'hypothesis', 'theory', 'research', 'data', 'analysis'],
      'history': ['century', 'war', 'empire', 'revolution', 'ancient', 'medieval'],
      'literature': ['author', 'novel', 'poem', 'character', 'plot', 'theme'],
      'computer science': ['algorithm', 'programming', 'software', 'database', 'code'],
      'biology': ['cell', 'organism', 'evolution', 'genetics', 'species'],
      'chemistry': ['molecule', 'reaction', 'element', 'compound', 'atom'],
      'physics': ['force', 'energy', 'motion', 'wave', 'particle', 'quantum']
    };

    const lowerContent = content.toLowerCase();
    const foundTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword));
      if (matches.length > 0) {
        foundTopics.push(topic);
      }
    }

    return foundTopics.length > 0 ? foundTopics.slice(0, 3) : ['general'];
  }

  // Simple keyword-based search as fallback
  private keywordSearch(question: string): Array<{chunk: string, score: number, documentId: string}> {
    const results: Array<{chunk: string, score: number, documentId: string}> = [];
    const queryWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);

    for (const [docId, docData] of this.documentEmbeddings.entries()) {
      for (let i = 0; i < docData.chunks.length; i++) {
        const chunk = docData.chunks[i].toLowerCase();
        let score = 0;

        // Count keyword matches
        for (const word of queryWords) {
          const matches = (chunk.match(new RegExp(word, 'g')) || []).length;
          score += matches;
        }

        if (score > 0) {
          results.push({
            chunk: docData.chunks[i],
            score: score / queryWords.length, // Normalize score
            documentId: docId
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  // Generate answer from chunks
  private generateAnswerFromChunks(
    chunks: Array<{chunk: string, score: number, documentId: string}>,
    question: string,
    questionIntent: string
  ): any {
    const context = chunks.map(c => c.chunk).join('\n\n');
    const answer = this.generateContextBasedAnswer(question.toLowerCase(), context);

    return {
      answer,
      sources: chunks.slice(0, 3).map(chunk => ({
        documentId: chunk.documentId,
        relevance: chunk.score,
        sourceText: chunk.chunk,
        section: 'General Content',
        documentType: 'study_material'
      })),
      questionIntent,
      confidence: 0.7
    };
  }

  // Generate quiz questions from document content
  async generateQuizFromDocuments(documentIds: string[], questionCount: number = 10): Promise<{
    questions: Array<{
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
    }>;
    totalQuestions: number;
    estimatedTime: number;
  }> {
    console.log('🎯 Generating quiz questions from documents...');

    if (documentIds.length === 0) {
      throw new Error('No documents available for quiz generation');
    }

    const questions: any[] = [];
    const questionsPerDocument = Math.ceil(questionCount / documentIds.length);

    for (const docId of documentIds) {
      const docData = this.documentEmbeddings.get(docId);
      if (!docData) continue;

      // Get diverse chunks from the document
      const selectedChunks = this.selectDiverseChunks(docData.chunks, questionsPerDocument);

      for (let i = 0; i < selectedChunks.length && questions.length < questionCount; i++) {
        const chunk = selectedChunks[i];
        const generatedQuestions = await this.generateQuestionsFromChunk(chunk, docId);
        questions.push(...generatedQuestions);
      }
    }

    // Shuffle and limit questions
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);

    return {
      questions: shuffledQuestions,
      totalQuestions: shuffledQuestions.length,
      estimatedTime: shuffledQuestions.length * 2 // 2 minutes per question
    };
  }

  // Select diverse chunks for question generation
  private selectDiverseChunks(chunks: string[], count: number): string[] {
    if (chunks.length <= count) return chunks;

    const step = Math.floor(chunks.length / count);
    const selected: string[] = [];

    for (let i = 0; i < count; i++) {
      const index = i * step;
      if (index < chunks.length) {
        selected.push(chunks[index]);
      }
    }

    return selected;
  }

  // Generate questions from a specific chunk
  private async generateQuestionsFromChunk(chunk: string, documentId: string): Promise<Array<{
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
  }>> {
    const questions: any[] = [];

    // Extract key concepts and facts from the chunk
    const concepts = this.extractKeyConceptsFromChunk(chunk);

    for (const concept of concepts.slice(0, 2)) { // Max 2 questions per chunk
      const questionTypes = ['multiple-choice', 'short-answer', 'true-false'];
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      const question = await this.createQuestionFromConcept(concept, chunk, questionType, documentId);
      if (question) {
        questions.push(question);
      }
    }

    return questions;
  }

  // Extract key concepts from a chunk
  private extractKeyConceptsFromChunk(chunk: string): Array<{
    concept: string;
    context: string;
    importance: number;
  }> {
    const concepts: Array<{ concept: string; context: string; importance: number }> = [];

    // Look for definitions, key terms, and important statements
    const definitionPatterns = [
      /(.+?)\s+is\s+(.+?)[\.\n]/gi,
      /(.+?)\s+are\s+(.+?)[\.\n]/gi,
      /(.+?)\s+refers to\s+(.+?)[\.\n]/gi,
      /(.+?)\s+means\s+(.+?)[\.\n]/gi,
      /(.+?)\s+can be defined as\s+(.+?)[\.\n]/gi
    ];

    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(chunk)) !== null && concepts.length < 5) {
        const concept = match[1].trim();
        const definition = match[2].trim();

        if (concept.length > 3 && concept.length < 50 && definition.length > 10) {
          concepts.push({
            concept: concept,
            context: definition,
            importance: this.calculateConceptImportance(concept, chunk)
          });
        }
      }
    });

    // Also look for numbered lists and bullet points
    const listItems = chunk.match(/(?:^\d+\.|^[-•]\s+)(.+?)(?=\n|$)/gm);
    if (listItems) {
      listItems.forEach(item => {
        const cleanItem = item.replace(/^\d+\.|^[-•]\s+/, '').trim();
        if (cleanItem.length > 10 && cleanItem.length < 100) {
          concepts.push({
            concept: cleanItem.split(' ').slice(0, 5).join(' '), // First few words as concept
            context: cleanItem,
            importance: 0.7
          });
        }
      });
    }

    return concepts.sort((a, b) => b.importance - a.importance);
  }

  // Calculate importance of a concept
  private calculateConceptImportance(concept: string, chunk: string): number {
    const conceptLower = concept.toLowerCase();
    const chunkLower = chunk.toLowerCase();

    // Count occurrences
    const occurrences = (chunkLower.match(new RegExp(conceptLower, 'g')) || []).length;

    // Check for importance indicators
    const importanceIndicators = ['important', 'key', 'main', 'primary', 'essential', 'fundamental'];
    const hasImportanceIndicator = importanceIndicators.some(indicator =>
      chunkLower.includes(indicator + ' ' + conceptLower) ||
      chunkLower.includes(conceptLower + ' is ' + indicator)
    );

    let importance = Math.min(occurrences * 0.2, 1.0);
    if (hasImportanceIndicator) importance += 0.3;

    return Math.min(importance, 1.0);
  }

  // Create a specific question from a concept
  private async createQuestionFromConcept(
    concept: { concept: string; context: string; importance: number },
    chunk: string,
    questionType: string,
    documentId: string
  ): Promise<any> {
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (questionType) {
      case 'multiple-choice':
        return this.createMultipleChoiceQuestion(concept, chunk, questionId, documentId);
      case 'short-answer':
        return this.createShortAnswerQuestion(concept, chunk, questionId, documentId);
      case 'true-false':
        return this.createTrueFalseQuestion(concept, chunk, questionId, documentId);
      default:
        return null;
    }
  }

  // Create multiple choice question
  private createMultipleChoiceQuestion(
    concept: { concept: string; context: string; importance: number },
    chunk: string,
    questionId: string,
    documentId: string
  ): any {
    const question = `What is ${concept.concept}?`;
    const correctAnswer = concept.context;

    // Generate plausible wrong answers
    const wrongAnswers = [
      `A type of algorithm used in data processing`,
      `A method for organizing information systematically`,
      `A framework for analyzing complex problems`
    ];

    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return {
      id: questionId,
      question,
      type: 'multiple-choice',
      options,
      correctAnswer,
      explanation: `According to the study material: ${concept.context}`,
      difficulty: concept.importance > 0.8 ? 'hard' : concept.importance > 0.5 ? 'medium' : 'easy',
      topic: this.extractTopicFromChunk(chunk),
      sourceChunk: chunk.substring(0, 200) + '...',
      documentId
    };
  }

  // Create short answer question
  private createShortAnswerQuestion(
    concept: { concept: string; context: string; importance: number },
    chunk: string,
    questionId: string,
    documentId: string
  ): any {
    const questionTemplates = [
      `Define ${concept.concept}.`,
      `Explain what ${concept.concept} means.`,
      `What is ${concept.concept}?`,
      `Describe ${concept.concept} in your own words.`
    ];

    const question = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

    return {
      id: questionId,
      question,
      type: 'short-answer',
      correctAnswer: concept.context,
      explanation: `Expected answer: ${concept.context}`,
      difficulty: concept.importance > 0.8 ? 'hard' : concept.importance > 0.5 ? 'medium' : 'easy',
      topic: this.extractTopicFromChunk(chunk),
      sourceChunk: chunk.substring(0, 200) + '...',
      documentId
    };
  }

  // Create true/false question
  private createTrueFalseQuestion(
    concept: { concept: string; context: string; importance: number },
    chunk: string,
    questionId: string,
    documentId: string
  ): any {
    const isTrue = Math.random() > 0.5;

    let question: string;
    let correctAnswer: string;
    let explanation: string;

    if (isTrue) {
      question = `True or False: ${concept.concept} ${concept.context}`;
      correctAnswer = 'True';
      explanation = `True. According to the material: ${concept.context}`;
    } else {
      // Create a false statement by modifying the context
      const falseContext = this.createFalseStatement(concept.context);
      question = `True or False: ${concept.concept} ${falseContext}`;
      correctAnswer = 'False';
      explanation = `False. The correct information is: ${concept.context}`;
    }

    return {
      id: questionId,
      question,
      type: 'true-false',
      options: ['True', 'False'],
      correctAnswer,
      explanation,
      difficulty: concept.importance > 0.8 ? 'hard' : concept.importance > 0.5 ? 'medium' : 'easy',
      topic: this.extractTopicFromChunk(chunk),
      sourceChunk: chunk.substring(0, 200) + '...',
      documentId
    };
  }

  // Create a false statement for true/false questions
  private createFalseStatement(originalContext: string): string {
    const falsifications = [
      'is not used in modern applications',
      'was invented in the 21st century',
      'is only applicable to theoretical scenarios',
      'has no practical applications',
      'is considered outdated by experts'
    ];

    return falsifications[Math.floor(Math.random() * falsifications.length)];
  }

  // Extract topic from chunk
  private extractTopicFromChunk(chunk: string): string {
    const topicKeywords = [
      'machine learning', 'data science', 'algorithm', 'programming', 'statistics',
      'mathematics', 'computer science', 'artificial intelligence', 'database',
      'software engineering', 'web development', 'cybersecurity'
    ];

    const chunkLower = chunk.toLowerCase();
    for (const keyword of topicKeywords) {
      if (chunkLower.includes(keyword)) {
        return keyword;
      }
    }

    return 'General Study Material';
  }

  // Evaluate student answer for quiz
  async evaluateAnswer(questionId: string, studentAnswer: string, correctAnswer: string, questionType: string): Promise<{
    isCorrect: boolean;
    score: number;
    feedback: string;
    explanation: string;
  }> {
    let isCorrect = false;
    let score = 0;
    let feedback = '';

    switch (questionType) {
      case 'multiple-choice':
      case 'true-false':
        isCorrect = studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        score = isCorrect ? 1 : 0;
        feedback = isCorrect ? '✅ Correct!' : '❌ Incorrect';
        break;

      case 'short-answer':
        // Simple keyword matching for short answers
        const studentWords = studentAnswer.toLowerCase().split(/\s+/);
        const correctWords = correctAnswer.toLowerCase().split(/\s+/);
        const matchingWords = studentWords.filter(word =>
          correctWords.some(correctWord =>
            correctWord.includes(word) || word.includes(correctWord)
          )
        );

        const similarity = matchingWords.length / correctWords.length;
        isCorrect = similarity >= 0.6; // 60% similarity threshold
        score = Math.min(similarity, 1.0);

        if (score >= 0.8) feedback = '✅ Excellent answer!';
        else if (score >= 0.6) feedback = '✅ Good answer!';
        else if (score >= 0.4) feedback = '⚠️ Partially correct';
        else feedback = '❌ Needs improvement';
        break;
    }

    return {
      isCorrect,
      score,
      feedback,
      explanation: correctAnswer
    };
  }

  // Cross-document research compilation and synthesis
  async generateResearchSynthesis(question: string, documentIds: string[]): Promise<{
    synthesis: string;
    crossDocumentInsights: Array<{
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
    documentCoverage: Array<{
      documentId: string;
      documentName: string;
      relevantChunks: number;
      keyContributions: string[];
    }>;
    confidence: number;
  }> {
    console.log('🔬 Generating cross-document research synthesis...');

    if (documentIds.length < 2) {
      throw new Error('Research synthesis requires at least 2 documents');
    }

    // Step 1: Find relevant content across all documents
    const allRelevantChunks = await this.semanticSearch(question, 20); // Get more chunks for synthesis

    // Step 2: Group chunks by document
    const chunksByDocument = this.groupChunksByDocument(allRelevantChunks);

    // Step 3: Identify cross-document themes and patterns
    const crossDocumentThemes = await this.identifyCrossDocumentThemes(allRelevantChunks, question);

    // Step 4: Generate synthesis
    const synthesis = await this.generateCrossDocumentSynthesis(crossDocumentThemes, question);

    // Step 5: Calculate document coverage
    const documentCoverage = this.calculateDocumentCoverage(chunksByDocument, documentIds);

    // Step 6: Calculate confidence based on cross-document agreement
    const confidence = this.calculateSynthesisConfidence(crossDocumentThemes, allRelevantChunks);

    return {
      synthesis,
      crossDocumentInsights: crossDocumentThemes,
      documentCoverage,
      confidence
    };
  }

  // Group chunks by document for analysis
  private groupChunksByDocument(chunks: Array<{
    chunk: string,
    score: number,
    documentId: string,
    section?: string,
    chunkIndex?: number,
    documentType?: string
  }>): Map<string, Array<{
    chunk: string,
    score: number,
    section?: string,
    chunkIndex?: number,
    documentType?: string
  }>> {
    const grouped = new Map();

    for (const chunk of chunks) {
      if (!grouped.has(chunk.documentId)) {
        grouped.set(chunk.documentId, []);
      }
      grouped.get(chunk.documentId).push({
        chunk: chunk.chunk,
        score: chunk.score,
        section: chunk.section,
        chunkIndex: chunk.chunkIndex,
        documentType: chunk.documentType
      });
    }

    return grouped;
  }

  // Identify themes that appear across multiple documents
  private async identifyCrossDocumentThemes(chunks: Array<{
    chunk: string,
    score: number,
    documentId: string,
    section?: string,
    chunkIndex?: number,
    documentType?: string
  }>, question: string): Promise<Array<{
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
  }>> {
    const themes: Array<{
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
    }> = [];

    // Extract key concepts from the question
    const questionConcepts = this.extractResearchConcepts(question);

    for (const concept of questionConcepts) {
      const conceptChunks = chunks.filter(chunk =>
        chunk.chunk.toLowerCase().includes(concept.toLowerCase()) ||
        this.calculateSemanticSimilarity(concept, chunk.chunk) > 0.7
      );

      if (conceptChunks.length >= 2) { // Must appear in at least 2 chunks
        const documentsForConcept = [...new Set(conceptChunks.map(c => c.documentId))];

        if (documentsForConcept.length >= 2) { // Must appear in at least 2 documents
          const excerpts = conceptChunks.map(chunk => ({
            documentId: chunk.documentId,
            documentName: this.getDocumentName(chunk.documentId),
            text: chunk.chunk.substring(0, 300) + '...',
            relevance: chunk.score,
            section: chunk.section
          }));

          const analysis = await this.analyzeThemeAcrossDocuments(concept, conceptChunks);

          themes.push({
            theme: concept,
            documents: documentsForConcept,
            excerpts,
            analysis
          });
        }
      }
    }

    return themes.slice(0, 5); // Limit to top 5 themes
  }

  // Extract research concepts from question
  private extractResearchConcepts(question: string): string[] {
    const concepts: string[] = [];

    // Look for specific research terms
    const researchPatterns = [
      /about\s+([^?]+)/i,
      /regarding\s+([^?]+)/i,
      /concerning\s+([^?]+)/i,
      /on\s+([^?]+)/i,
      /say about\s+([^?]+)/i
    ];

    for (const pattern of researchPatterns) {
      const match = question.match(pattern);
      if (match) {
        const concept = match[1].trim().replace(/[^\w\s]/g, '');
        if (concept.length > 2) {
          concepts.push(concept);
        }
      }
    }

    // Also extract key terms using existing method
    const keywords = this.extractKeywords(question);
    concepts.push(...keywords.slice(0, 3));

    return [...new Set(concepts)]; // Remove duplicates
  }

  // Calculate semantic similarity between two texts
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  // Get document name from ID
  private getDocumentName(documentId: string): string {
    const metadata = this.documentMetadata.get(documentId);
    return metadata?.name || documentId;
  }

  // Analyze how a theme appears across documents
  private async analyzeThemeAcrossDocuments(theme: string, chunks: Array<{
    chunk: string,
    score: number,
    documentId: string,
    section?: string
  }>): Promise<string> {
    const documentGroups = this.groupChunksByDocument(chunks);
    const analyses: string[] = [];

    for (const [docId, docChunks] of documentGroups.entries()) {
      const docName = this.getDocumentName(docId);
      const bestChunk = docChunks.sort((a, b) => b.score - a.score)[0];

      // Extract key points about the theme from this document
      const keyPoints = this.extractKeyPointsAboutTheme(theme, bestChunk.chunk);

      if (keyPoints.length > 0) {
        analyses.push(`**${docName}**: ${keyPoints.join(', ')}`);
      }
    }

    return analyses.join('\n\n');
  }

  // Extract key points about a theme from text
  private extractKeyPointsAboutTheme(theme: string, text: string): string[] {
    const points: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(theme.toLowerCase())) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 20 && cleanSentence.length < 150) {
          points.push(cleanSentence);
        }
      }
    }

    return points.slice(0, 3); // Top 3 points
  }

  // Generate cross-document synthesis
  private async generateCrossDocumentSynthesis(themes: Array<{
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
  }>, question: string): Promise<string> {
    if (themes.length === 0) {
      return "While I found relevant information in your documents, I couldn't identify clear cross-document themes for synthesis. The documents may address different aspects of your question.";
    }

    const synthesisLines: string[] = [];
    synthesisLines.push(`**Cross-Document Analysis: ${question}**\n`);

    // Overview
    const documentNames = [...new Set(themes.flatMap(t => t.excerpts.map(e => e.documentName)))];
    synthesisLines.push(`Based on analysis of ${documentNames.length} documents (${documentNames.join(', ')}), here's what emerges:\n`);

    // Theme-by-theme synthesis
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      synthesisLines.push(`**${i + 1}. ${theme.theme}**`);
      synthesisLines.push(`Found across ${theme.documents.length} documents:`);
      synthesisLines.push(theme.analysis);
      synthesisLines.push('');
    }

    // Cross-cutting insights
    if (themes.length > 1) {
      synthesisLines.push('**Cross-Cutting Insights:**');
      const commonDocuments = this.findCommonDocuments(themes);
      if (commonDocuments.length > 0) {
        synthesisLines.push(`Documents ${commonDocuments.join(', ')} provide the most comprehensive coverage, addressing multiple aspects of your question.`);
      }

      const complementaryInsights = this.identifyComplementaryInsights(themes);
      if (complementaryInsights) {
        synthesisLines.push(complementaryInsights);
      }
    }

    return synthesisLines.join('\n');
  }

  // Find documents that appear in multiple themes
  private findCommonDocuments(themes: Array<{
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
  }>): string[] {
    const documentCounts = new Map<string, number>();

    for (const theme of themes) {
      for (const excerpt of theme.excerpts) {
        const count = documentCounts.get(excerpt.documentName) || 0;
        documentCounts.set(excerpt.documentName, count + 1);
      }
    }

    return Array.from(documentCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([name, _]) => name);
  }

  // Identify complementary insights across themes
  private identifyComplementaryInsights(themes: Array<{
    theme: string;
    documents: string[];
    excerpts: Array<any>;
    analysis: string;
  }>): string {
    if (themes.length < 2) return '';

    const insights: string[] = [];

    // Look for methodological vs theoretical splits
    const methodological = themes.filter(t =>
      t.theme.toLowerCase().includes('method') ||
      t.theme.toLowerCase().includes('approach') ||
      t.theme.toLowerCase().includes('technique')
    );

    const theoretical = themes.filter(t =>
      t.theme.toLowerCase().includes('theory') ||
      t.theme.toLowerCase().includes('concept') ||
      t.theme.toLowerCase().includes('principle')
    );

    if (methodological.length > 0 && theoretical.length > 0) {
      insights.push('The documents provide both theoretical foundations and practical methodological approaches.');
    }

    // Look for consensus vs disagreement
    const consensusThemes = themes.filter(t => t.documents.length >= Math.ceil(themes.length * 0.7));
    if (consensusThemes.length > 0) {
      insights.push(`Strong consensus emerges around: ${consensusThemes.map(t => t.theme).join(', ')}.`);
    }

    return insights.join(' ');
  }

  // Calculate document coverage for research synthesis
  private calculateDocumentCoverage(chunksByDocument: Map<string, any[]>, documentIds: string[]): Array<{
    documentId: string;
    documentName: string;
    relevantChunks: number;
    keyContributions: string[];
  }> {
    const coverage: Array<{
      documentId: string;
      documentName: string;
      relevantChunks: number;
      keyContributions: string[];
    }> = [];

    for (const docId of documentIds) {
      const chunks = chunksByDocument.get(docId) || [];
      const docName = this.getDocumentName(docId);

      // Extract key contributions from top chunks
      const topChunks = chunks.sort((a, b) => b.score - a.score).slice(0, 3);
      const keyContributions = topChunks.map(chunk => {
        const sentences = chunk.chunk.split(/[.!?]+/);
        const bestSentence = sentences.find(s => s.trim().length > 20 && s.trim().length < 100);
        return bestSentence ? bestSentence.trim() : chunk.chunk.substring(0, 80) + '...';
      });

      coverage.push({
        documentId: docId,
        documentName: docName,
        relevantChunks: chunks.length,
        keyContributions: keyContributions.filter(Boolean)
      });
    }

    return coverage.sort((a, b) => b.relevantChunks - a.relevantChunks);
  }

  // Calculate synthesis confidence based on cross-document agreement
  private calculateSynthesisConfidence(themes: Array<{
    theme: string;
    documents: string[];
    excerpts: any[];
    analysis: string;
  }>, allChunks: any[]): number {
    if (themes.length === 0) return 0.3;

    // Base confidence on number of cross-document themes
    let confidence = Math.min(themes.length * 0.2, 0.8);

    // Boost confidence if themes span multiple documents
    const avgDocumentsPerTheme = themes.reduce((sum, theme) => sum + theme.documents.length, 0) / themes.length;
    if (avgDocumentsPerTheme >= 2) {
      confidence += 0.1;
    }

    // Boost confidence based on chunk relevance scores
    const avgRelevance = allChunks.reduce((sum, chunk) => sum + chunk.score, 0) / allChunks.length;
    confidence += avgRelevance * 0.1;

    return Math.min(confidence, 0.95);
  }

  // Detect if a question is asking for research synthesis across documents
  private isResearchSynthesisQuestion(question: string, documentIds: string[]): boolean {
    if (documentIds.length < 2) return false;

    const researchIndicators = [
      'what do these papers say',
      'what do the documents say',
      'across these papers',
      'across these documents',
      'what do these studies',
      'compare these papers',
      'synthesis',
      'compilation',
      'across all documents',
      'in these papers',
      'these research papers',
      'multiple papers',
      'all the papers',
      'research shows',
      'studies indicate',
      'papers discuss',
      'documents discuss',
      'literature says',
      'research suggests'
    ];

    const questionLower = question.toLowerCase();
    return researchIndicators.some(indicator => questionLower.includes(indicator));
  }

  // Generate helpful responses for general study questions without documents
  private generateGeneralStudyResponse(question: string): string {
    if (question.includes('overfitting')) {
      return "**Overfitting in Machine Learning:**\n\nOverfitting occurs when a model learns the training data too well, including noise and random fluctuations, resulting in poor performance on new data.\n\n**Key signs:**\n• High training accuracy, low validation accuracy\n• Model memorizes rather than generalizes\n• Poor performance on unseen data\n\n**Prevention:**\n• Use cross-validation\n• Apply regularization (L1, L2)\n• Implement early stopping\n• Increase training data\n\n*For more detailed explanations specific to your curriculum, upload your machine learning textbook!*";
    } else if (question.includes('classification') && question.includes('regression')) {
      return "**Classification vs Regression:**\n\n**Classification** predicts discrete categories:\n• Email spam detection (spam/not spam)\n• Image recognition (cat, dog, bird)\n• Medical diagnosis (disease/no disease)\n\n**Regression** predicts continuous values:\n• House price prediction\n• Stock price forecasting\n• Temperature prediction\n\n**Key difference:** Classification outputs labels, regression outputs numbers.\n\n*Upload your textbook for examples and explanations specific to your course!*";
    } else if (question.includes('neural network')) {
      return "**Neural Networks:**\n\nComputational models inspired by biological neural networks, consisting of interconnected nodes (neurons) organized in layers.\n\n**Basic structure:**\n• Input layer: Receives data\n• Hidden layers: Process information\n• Output layer: Produces predictions\n\n**Learning:** Through backpropagation, adjusting weights to minimize errors.\n\n**Types:** Feedforward, CNN, RNN, LSTM\n\n*For detailed explanations with your textbook's examples and terminology, please upload your study materials!*";
    } else if (question.includes('supervised learning')) {
      return "**Supervised Learning:**\n\nA machine learning approach where algorithms learn from labeled training data to make predictions on new data.\n\n**Process:**\n1. Training: Learn from input-output pairs\n2. Validation: Test on unseen data\n3. Prediction: Apply to new examples\n\n**Types:**\n• Classification (discrete outputs)\n• Regression (continuous outputs)\n\n**Examples:** Email filtering, image recognition, price prediction\n\n*Upload your course materials for explanations that match your curriculum exactly!*";
    } else if (question.includes('study') || question.includes('learn') || question.includes('exam')) {
      return "**Study Tips with StudyMate AI:**\n\n📚 **Upload your materials:** Get answers directly from your textbooks and notes\n🎯 **Ask specific questions:** \"What is [concept]?\" or \"Explain [topic]\"\n📝 **Review with sources:** See exact quotes from your materials\n⚡ **Quick clarification:** No need to search through pages manually\n\n**Best practices:**\n• Upload PDFs of textbooks, lecture notes, assignments\n• Ask one concept at a time for clarity\n• Use source paragraphs to verify understanding\n• Build on previous questions for deeper learning\n\n*Ready to help with your specific study materials!*";
    } else {
      return "I'm StudyMate AI, your personal study assistant! 🎓\n\n**I can help you with:**\n• Explaining concepts from your textbooks\n• Answering questions about uploaded materials\n• Providing study guidance and tips\n• Quick concept clarification during study sessions\n\n**For the best experience:**\n📤 Upload your PDF textbooks, lecture notes, or study materials\n❓ Ask specific questions about concepts you're studying\n🔍 Review source paragraphs to verify information\n\n**Try asking:** \"What is overfitting?\" or \"Explain the difference between classification and regression\"\n\n*Upload your study materials to get answers grounded in your specific curriculum!*";
    }
  }

  // Enhanced document analysis methods
  private detectDocumentType(content: string): string {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('chapter') && lowerContent.includes('introduction')) {
      return 'textbook';
    } else if (lowerContent.includes('lecture') || lowerContent.includes('slides')) {
      return 'lecture_notes';
    } else if (lowerContent.includes('assignment') || lowerContent.includes('homework')) {
      return 'assignment';
    } else if (lowerContent.includes('research') || lowerContent.includes('abstract')) {
      return 'research_paper';
    } else {
      return 'study_material';
    }
  }

  private extractSections(content: string): Array<{ title: string; content: string; startIndex: number }> {
    const sections: Array<{ title: string; content: string; startIndex: number }> = [];

    // Enhanced section detection patterns
    const patterns = [
      /(?:^|\n)(Chapter \d+[^\n]*)/gim,
      /(?:^|\n)(Section \d+[^\n]*)/gim,
      /(?:^|\n)(\d+\.\d+[^\n]*)/gim,
      /(?:^|\n)(Introduction[^\n]*)/gim,
      /(?:^|\n)(Conclusion[^\n]*)/gim,
      /(?:^|\n)(Summary[^\n]*)/gim,
      /(?:^|\n)(Definition[^\n]*)/gim,
      /(?:^|\n)(Example[^\n]*)/gim
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const title = match[1].trim();
        const startIndex = match.index;

        // Find content until next section or end
        const nextSectionIndex = this.findNextSectionIndex(content, startIndex + title.length);
        const sectionContent = content.substring(startIndex + title.length, nextSectionIndex).trim();

        if (sectionContent.length > 50) {
          sections.push({ title, content: sectionContent, startIndex });
        }
      }
    });

    return sections.sort((a, b) => a.startIndex - b.startIndex);
  }

  private findNextSectionIndex(content: string, currentIndex: number): number {
    const sectionPatterns = [
      /(?:\n|^)(Chapter \d+)/i,
      /(?:\n|^)(Section \d+)/i,
      /(?:\n|^)(\d+\.\d+)/i
    ];

    let nearestIndex = content.length;

    sectionPatterns.forEach(pattern => {
      const match = pattern.exec(content.substring(currentIndex));
      if (match) {
        const matchIndex = currentIndex + match.index;
        if (matchIndex < nearestIndex) {
          nearestIndex = matchIndex;
        }
      }
    });

    return nearestIndex;
  }

  private extractKeywords(content: string): string[] {
    // Enhanced keyword extraction for academic content
    const academicTerms = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        word.length < 20 &&
        !this.isStopWord(word)
      );

    const frequency: { [key: string]: number } = {};
    academicTerms.forEach(term => {
      frequency[term] = (frequency[term] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([term]) => term);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'must', 'shall', 'from', 'into', 'onto', 'upon', 'over', 'under'
    ]);
    return stopWords.has(word);
  }

  private createSmartChunks(content: string): string[] {
    const sections = this.extractSections(content);
    const chunks: string[] = [];

    if (sections.length > 0) {
      // Create chunks based on sections for better context
      sections.forEach(section => {
        const sectionText = `${section.title}\n${section.content}`;
        const sectionChunks = this.chunkText(sectionText, 400, 50);
        chunks.push(...sectionChunks);
      });
    } else {
      // Fallback to regular chunking
      chunks.push(...this.chunkText(content, 400, 50));
    }

    return chunks;
  }

  private findChunkSection(chunk: string, fullContent: string): string {
    const sections = this.extractSections(fullContent);

    for (const section of sections) {
      if (section.content.includes(chunk.substring(0, 100))) {
        return section.title;
      }
    }

    return 'General Content';
  }
}