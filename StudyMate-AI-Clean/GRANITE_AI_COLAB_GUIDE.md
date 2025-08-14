# 🚀 Granite 3.2 2B Instruct AI Application with Gradio

## 🎯 **Complete Guide: Build & Deploy Generative AI App**

This guide shows you how to build a generative AI application using IBM's Granite 3.2 2B Instruct model from Hugging Face and deploy it with Gradio in Google Colab.

## 📋 **What You'll Build**

- **Generative AI Chat Interface** using Granite 3.2 2B Instruct
- **Web-based UI** with Gradio for easy interaction
- **Google Colab deployment** with public sharing capability
- **Customizable prompts** and conversation history
- **Real-time text generation** with streaming responses

## 🔧 **Prerequisites**

1. **Google Account** for Google Colab access
2. **Hugging Face Account** (optional, for higher rate limits)
3. **Basic Python knowledge** (helpful but not required)

## 🚀 **Step-by-Step Implementation**

### **Step 1: Open Google Colab**
1. Go to [Google Colab](https://colab.research.google.com/)
2. Create a new notebook
3. Ensure you're using a GPU runtime:
   - Runtime → Change runtime type → Hardware accelerator → T4 GPU

### **Step 2: Install Required Libraries**
```python
# Install required packages
!pip install transformers torch gradio accelerate bitsandbytes
```

### **Step 3: Import Libraries and Setup**
```python
import torch
import gradio as gr
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import warnings
warnings.filterwarnings("ignore")

# Check if GPU is available
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")
```

### **Step 4: Load Granite 3.2 2B Instruct Model**
```python
# Model configuration
model_name = "ibm-granite/granite-3.2-2b-instruct"

print("Loading Granite 3.2 2B Instruct model...")
print("This may take a few minutes...")

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Load model with optimization for Colab
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,  # Use half precision for memory efficiency
    device_map="auto",          # Automatically map to available devices
    trust_remote_code=True
)

print("✅ Model loaded successfully!")
```

### **Step 5: Create Text Generation Pipeline**
```python
# Create generation pipeline
generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    torch_dtype=torch.float16,
    device_map="auto"
)

def generate_response(prompt, max_length=512, temperature=0.7, top_p=0.9):
    """
    Generate response using Granite 3.2 2B Instruct
    """
    try:
        # Format prompt for instruction following
        formatted_prompt = f"<|user|>\n{prompt}\n<|assistant|>\n"
        
        # Generate response
        outputs = generator(
            formatted_prompt,
            max_length=max_length,
            temperature=temperature,
            top_p=top_p,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            return_full_text=False
        )
        
        # Extract generated text
        response = outputs[0]['generated_text']
        
        # Clean up the response
        response = response.replace(formatted_prompt, "").strip()
        
        return response
        
    except Exception as e:
        return f"Error generating response: {str(e)}"

# Test the function
test_response = generate_response("Hello! How are you today?")
print("Test Response:", test_response)
```

## 🎨 **Advanced Gradio Interface**

### **Step 6: Create Enhanced Gradio Interface**
```python
# Conversation history storage
conversation_history = []

def chat_with_granite(message, history, max_length, temperature, top_p):
    """
    Enhanced chat function with conversation history
    """
    global conversation_history
    
    # Add user message to history
    conversation_history.append({"role": "user", "content": message})
    
    # Create context from conversation history
    context = ""
    for msg in conversation_history[-5:]:  # Keep last 5 exchanges
        if msg["role"] == "user":
            context += f"User: {msg['content']}\n"
        else:
            context += f"Assistant: {msg['content']}\n"
    
    # Generate response
    full_prompt = f"{context}User: {message}\nAssistant:"
    response = generate_response(full_prompt, max_length, temperature, top_p)
    
    # Add assistant response to history
    conversation_history.append({"role": "assistant", "content": response})
    
    # Update chat history for display
    history.append([message, response])
    
    return history, ""

def clear_conversation():
    """Clear conversation history"""
    global conversation_history
    conversation_history = []
    return []

# Create Gradio interface
with gr.Blocks(title="🚀 Granite 3.2 2B AI Assistant", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🚀 Granite 3.2 2B AI Assistant
    
    **Powered by IBM's Granite 3.2 2B Instruct Model**
    
    This AI assistant can help you with:
    - ✅ Answering questions and providing explanations
    - ✅ Creative writing and content generation  
    - ✅ Code assistance and programming help
    - ✅ Analysis and problem-solving
    - ✅ General conversation and chat
    
    *Adjust the parameters below to customize the AI's responses!*
    """)
    
    with gr.Row():
        with gr.Column(scale=3):
            # Chat interface
            chatbot = gr.Chatbot(
                label="💬 Chat with Granite AI",
                height=400,
                show_label=True,
                container=True
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    label="Your Message",
                    placeholder="Type your message here... (e.g., 'Explain quantum computing' or 'Write a Python function')",
                    lines=2,
                    scale=4
                )
                send_btn = gr.Button("Send 🚀", variant="primary", scale=1)
            
            with gr.Row():
                clear_btn = gr.Button("Clear Chat 🗑️", variant="secondary")
        
        with gr.Column(scale=1):
            # Parameters panel
            gr.Markdown("### ⚙️ Generation Parameters")
            
            max_length = gr.Slider(
                minimum=50,
                maximum=1024,
                value=512,
                step=50,
                label="Max Length",
                info="Maximum response length"
            )
            
            temperature = gr.Slider(
                minimum=0.1,
                maximum=2.0,
                value=0.7,
                step=0.1,
                label="Temperature",
                info="Creativity level (higher = more creative)"
            )
            
            top_p = gr.Slider(
                minimum=0.1,
                maximum=1.0,
                value=0.9,
                step=0.05,
                label="Top-p",
                info="Diversity of word selection"
            )
            
            gr.Markdown("""
            ### 💡 Tips:
            - **Lower temperature** (0.3-0.5) for factual responses
            - **Higher temperature** (0.8-1.2) for creative writing
            - **Top-p 0.9** works well for most cases
            """)
    
    # Example prompts
    gr.Markdown("### 🎯 Example Prompts to Try:")
    
    example_prompts = [
        "Explain the concept of machine learning in simple terms",
        "Write a Python function to calculate fibonacci numbers",
        "What are the benefits of renewable energy?",
        "Create a short story about a robot learning to paint",
        "How does blockchain technology work?",
        "Write a professional email requesting a meeting"
    ]
    
    with gr.Row():
        for i, prompt in enumerate(example_prompts[:3]):
            gr.Button(prompt, size="sm").click(
                lambda p=prompt: p, outputs=msg
            )
    
    with gr.Row():
        for i, prompt in enumerate(example_prompts[3:]):
            gr.Button(prompt, size="sm").click(
                lambda p=prompt: p, outputs=msg
            )
    
    # Event handlers
    send_btn.click(
        chat_with_granite,
        inputs=[msg, chatbot, max_length, temperature, top_p],
        outputs=[chatbot, msg]
    )
    
    msg.submit(
        chat_with_granite,
        inputs=[msg, chatbot, max_length, temperature, top_p],
        outputs=[chatbot, msg]
    )
    
    clear_btn.click(clear_conversation, outputs=chatbot)

# Launch the interface
print("🚀 Launching Granite AI Assistant...")
demo.launch(
    share=True,          # Create public link
    debug=True,          # Enable debug mode
    server_name="0.0.0.0",  # Allow external access
    server_port=7860     # Default Gradio port
)
```

## 🎯 **Usage Examples**

### **Example Conversations:**

**1. Educational Questions:**
```
User: "Explain photosynthesis in simple terms"
AI: "Photosynthesis is like a plant's way of making food using sunlight..."
```

**2. Code Generation:**
```
User: "Write a Python function to reverse a string"
AI: "Here's a simple Python function to reverse a string:
def reverse_string(s):
    return s[::-1]"
```

**3. Creative Writing:**
```
User: "Write a haiku about artificial intelligence"
AI: "Silicon minds think
Processing data streams fast
Future unfolds bright"
```

## 🔧 **Customization Options**

### **Model Parameters:**
- **Temperature**: Controls randomness (0.1 = focused, 1.5 = creative)
- **Top-p**: Controls diversity (0.9 recommended)
- **Max Length**: Response length (50-1024 tokens)

### **Interface Customization:**
```python
# Custom CSS styling
css = """
.gradio-container {
    font-family: 'Arial', sans-serif;
}
.chat-message {
    border-radius: 10px;
    padding: 10px;
}
"""

# Apply custom styling
demo = gr.Blocks(css=css, theme=gr.themes.Soft())
```

## 🚀 **Deployment & Sharing**

### **Public Link:**
- Gradio automatically creates a public link when `share=True`
- Link format: `https://xxxxx.gradio.live`
- Valid for 72 hours

### **Permanent Deployment Options:**
1. **Hugging Face Spaces** (Free)
2. **Google Cloud Run** (Paid)
3. **AWS EC2** (Paid)
4. **Local deployment** with ngrok

## 📊 **Performance Optimization**

### **Memory Management:**
```python
# Clear GPU cache periodically
import gc
torch.cuda.empty_cache()
gc.collect()
```

### **Batch Processing:**
```python
# For multiple requests
def batch_generate(prompts, **kwargs):
    responses = []
    for prompt in prompts:
        response = generate_response(prompt, **kwargs)
        responses.append(response)
    return responses
```

## 🎓 **Educational Benefits**

### **Perfect for:**
- **Learning AI/ML concepts** through hands-on experience
- **Prototyping chatbots** and conversational AI
- **Understanding transformer models** and text generation
- **Experimenting with prompt engineering**
- **Building portfolio projects** for AI/ML roles

**Your Granite 3.2 2B AI application is ready to deploy! 🚀🤖✨**
