# 🚀 StudyMate AI - Complete Educational Assistant

[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-blue.svg)](https://tailwindcss.com/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Transformers-yellow.svg)](https://huggingface.co/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 🎯 **What is StudyMate AI?**

StudyMate AI is a comprehensive educational assistant that combines multiple AI-powered features for enhanced learning:

- 📚 **PDF Analysis & Q&A** - Upload study materials and ask intelligent questions
- 🎓 **Viva/Exam Preparation** - Practice sessions with Q&A logging and export
- 🧠 **Quiz Generation** - Automated quiz creation from your PDF content
- 🔬 **Multi-PDF Research** - Cross-document analysis and synthesis
- 💬 **ChatGPT-Style Interface** - Intuitive chat experience with real-time responses

## 🚀 **Quick Start Options**

### **🔥 Option 1: Google Colab (Instant Deployment)**
1. Open [Google Colab](https://colab.research.google.com/)
2. Copy code from `granite_ai_colab_notebook.py`
3. Run cells to deploy with IBM Granite 3.2B model
4. Get instant public link to share your AI app

**⏱️ Time to deploy: 5 minutes**

### **💻 Option 2: Local Development**
```bash
# Clone the repository
git clone https://github.com/yourusername/studymate-ai.git
cd studymate-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:8080
```

### **☁️ Option 3: Deploy Your Own**
- **Hugging Face Spaces**: Upload to HF Spaces for permanent hosting
- **Vercel/Netlify**: Deploy the React app with one click
- **Google Cloud/AWS**: Full cloud deployment with scaling

## 🎯 **Key Features**

### **📚 Multi-PDF Research Compilation**
Upload multiple research papers and ask questions like:
- "What do these papers say about ensemble methods?"
- "Compare the methodologies across these documents"
- Get cross-document insights and thematic analysis

### **🧠 Automated Quiz Generation**
- AI creates questions FROM your PDF content
- Multiple choice, short answer, and true/false questions
- Timed testing with comprehensive results
- Export quiz history for review

### **🎓 Viva/Exam Preparation**
- Practice sessions with real-time Q&A
- All questions and answers logged with timestamps
- Export complete session history
- Confidence tracking and progress monitoring

### **💬 Intelligent Chat Interface**
- ChatGPT-style conversation experience
- Context-aware responses from your documents
- Source verification with exact quotes
- Smart suggestions based on uploaded content

## 📚 **Complete Documentation**

- 🔬 **Multi-PDF Research**: [`MULTI_PDF_RESEARCH_GUIDE.md`](./MULTI_PDF_RESEARCH_GUIDE.md)
- 🧠 **Quiz Generation**: [`QUIZ_GENERATION_GUIDE.md`](./QUIZ_GENERATION_GUIDE.md)
- 🎓 **Viva Preparation**: [`VIVA_PREPARATION_GUIDE.md`](./VIVA_PREPARATION_GUIDE.md)
- 🤖 **Granite AI Deployment**: [`GRANITE_AI_COLAB_GUIDE.md`](./GRANITE_AI_COLAB_GUIDE.md)
- ⚡ **Quick Colab Setup**: [`COLAB_QUICK_START.md`](./COLAB_QUICK_START.md)

## 🎯 **Use Cases**

### **👨‍🎓 For Students:**
- Upload textbooks and get instant Q&A assistance
- Generate practice quizzes from study materials
- Prepare for viva voce examinations with realistic practice
- Research across multiple academic papers with synthesis

### **👨‍🏫 For Educators:**
- Create interactive study materials for students
- Generate assessment questions automatically from content
- Provide AI tutoring assistance for complex topics
- Analyze student learning patterns and progress

### **👨‍🔬 For Researchers:**
- Synthesize findings across multiple research papers
- Extract common themes from literature reviews
- Compare methodologies across different studies
- Generate research insights and identify gaps

## 🛠️ **Technology Stack**

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **AI Models**: IBM Granite 3.2B Instruct via Hugging Face
- **PDF Processing**: PDF.js for robust text extraction
- **Deployment**: Gradio for instant web interfaces
- **Hosting**: Google Colab, Hugging Face Spaces, Vercel

## 📊 **Project Statistics**

- ✅ **5 Major Features** fully implemented
- ✅ **80+ Components** with TypeScript
- ✅ **Complete Documentation** with examples
- ✅ **Production Ready** with error handling
- ✅ **Mobile Responsive** design
- ✅ **Real-time AI** responses

## 🎉 **Getting Started**

### **🚀 Fastest Way (5 minutes):**
1. **Try the Colab version** using `COLAB_QUICK_START.md`
2. **Upload some PDFs** and start asking questions
3. **Generate quizzes** from your content
4. **Share the public link** with others

### **💻 Development Setup:**
1. **Clone this repository**
2. **Install dependencies** with `npm install`
3. **Start development** with `npm run dev`
4. **Read the guides** to understand all features

### **🌟 Advanced Usage:**
1. **Deploy to Hugging Face Spaces** for permanent hosting
2. **Customize the AI models** for specific domains
3. **Extend with new features** using the modular architecture
4. **Integrate with learning management systems**

## 📁 **Project Structure**

```
studymate-ai/
├── src/
│   ├── components/          # React components
│   │   ├── ChatInterface.tsx    # Main chat interface
│   │   ├── QuizInterface.tsx    # Quiz generation system
│   │   ├── PDFUpload.tsx        # PDF upload component
│   │   └── ui/                  # UI component library
│   ├── services/            # Core services
│   │   ├── StudyMateAI.ts       # AI functionality
│   │   ├── SessionManager.ts    # Session management
│   │   └── PDFProcessor.ts      # PDF processing
│   ├── pages/               # Application pages
│   └── lib/                 # Utility functions
├── public/                  # Static assets
├── docs/                    # Documentation
└── granite_ai_colab_notebook.py  # Complete Colab deployment
```

## 🤝 **Contributing**

We welcome contributions! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 **Acknowledgments**

- **IBM** for the Granite 3.2B Instruct model
- **Hugging Face** for the transformers library and hosting
- **Google Colab** for free GPU access
- **React and TypeScript** communities

---

**Transform your learning experience with AI! 🚀📚✨**

**Star ⭐ this repository if you find it helpful!**
