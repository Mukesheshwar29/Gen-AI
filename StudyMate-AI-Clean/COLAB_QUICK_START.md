# ⚡ Quick Start: Granite AI in Google Colab

## 🚀 **5-Minute Setup Guide**

Follow these steps to get your Granite 3.2 2B AI application running in Google Colab:

### **Step 1: Open Google Colab**
1. Go to [colab.research.google.com](https://colab.research.google.com/)
2. Click **"New notebook"**
3. **IMPORTANT**: Change to GPU runtime
   - Runtime → Change runtime type → Hardware accelerator → **T4 GPU** → Save

### **Step 2: Copy-Paste Code Cells**

Copy and paste each section below into separate cells in your Colab notebook:

---

#### **📦 CELL 1: Install Libraries**
```python
!pip install transformers torch gradio accelerate bitsandbytes -q
print("✅ All libraries installed successfully!")
```

---

#### **🔧 CELL 2: Setup and Imports**
```python
import torch
import gradio as gr
from transformers import AutoTokenizer, AutoModelForCausalLM
import warnings
warnings.filterwarnings("ignore")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 Using device: {device}")
print(f"🔥 GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU'}")
```

---

#### **🤖 CELL 3: Load Granite Model**
```python
model_name = "ibm-granite/granite-3.2-2b-instruct"

print("🤖 Loading Granite 3.2 2B Instruct model...")
print("⏳ This may take 2-3 minutes...")

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# Load model
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True,
    low_cpu_mem_usage=True
)

print("✅ Model loaded successfully!")
```

---

#### **💬 CELL 4: Text Generation Function**
```python
def generate_response(prompt, max_length=512, temperature=0.7, top_p=0.9):
    try:
        formatted_prompt = f"<|user|>\n{prompt}\n<|assistant|>\n"
        
        inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True, max_length=1024)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        if "<|assistant|>" in full_response:
            response = full_response.split("<|assistant|>")[-1].strip()
        else:
            response = full_response.replace(formatted_prompt, "").strip()
        
        return response
        
    except Exception as e:
        return f"❌ Error: {str(e)}"

# Test
test_response = generate_response("Hello! How are you?", max_length=100)
print(f"🤖 Test: {test_response}")
```

---

#### **🎨 CELL 5: Gradio Interface**
```python
conversation_history = []

def chat_with_granite(message, history, max_length, temperature, top_p):
    if not message.strip():
        return history, ""
    
    response = generate_response(message, max_length, temperature, top_p)
    history.append([message, response])
    return history, ""

def clear_conversation():
    global conversation_history
    conversation_history = []
    return []

# Create interface
with gr.Blocks(title="🚀 Granite AI Assistant", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🚀 Granite 3.2 2B AI Assistant
    **Powered by IBM's Granite 3.2 2B Instruct Model**
    
    Ask me anything! I can help with:
    - ✅ Questions and explanations
    - ✅ Creative writing
    - ✅ Code assistance
    - ✅ Problem solving
    - ✅ General conversation
    """)
    
    with gr.Row():
        with gr.Column(scale=3):
            chatbot = gr.Chatbot(label="💬 Chat", height=500)
            
            with gr.Row():
                msg = gr.Textbox(
                    label="Your Message",
                    placeholder="Type your message here...",
                    lines=2,
                    scale=4
                )
                send_btn = gr.Button("Send 🚀", variant="primary", scale=1)
            
            clear_btn = gr.Button("Clear Chat 🗑️", variant="secondary")
        
        with gr.Column(scale=1):
            gr.Markdown("### ⚙️ Settings")
            
            max_length = gr.Slider(50, 1024, 512, label="Max Length")
            temperature = gr.Slider(0.1, 2.0, 0.7, label="Temperature")
            top_p = gr.Slider(0.1, 1.0, 0.9, label="Top-p")
    
    # Example prompts
    gr.Markdown("### 🎯 Try These:")
    examples = [
        "Explain quantum computing",
        "Write a Python function",
        "Create a short story",
        "What is photosynthesis?",
        "Help me with math",
        "Write a poem"
    ]
    
    with gr.Row():
        for example in examples[:3]:
            gr.Button(example, size="sm").click(lambda x=example: x, outputs=msg)
    
    with gr.Row():
        for example in examples[3:]:
            gr.Button(example, size="sm").click(lambda x=example: x, outputs=msg)
    
    # Event handlers
    send_btn.click(chat_with_granite, [msg, chatbot, max_length, temperature, top_p], [chatbot, msg])
    msg.submit(chat_with_granite, [msg, chatbot, max_length, temperature, top_p], [chatbot, msg])
    clear_btn.click(clear_conversation, outputs=chatbot)
```

---

#### **🚀 CELL 6: Launch App**
```python
print("🚀 Launching Granite AI Assistant...")

demo.launch(
    share=True,              # Creates public link
    debug=True,
    server_name="0.0.0.0",
    server_port=7860
)

print("🎉 Your AI app is now live!")
print("🔗 Use the public link to share with others")
```

---

## 🎯 **What You'll Get**

After running all cells, you'll have:

- **🤖 AI Chat Interface** with Granite 3.2 2B model
- **🌐 Public Gradio Link** (shareable for 72 hours)
- **⚙️ Customizable Parameters** (temperature, length, etc.)
- **💬 Real-time Chat** with conversation history
- **🎨 Professional UI** with example prompts

## 📊 **Expected Performance**

- **Model Size**: ~4GB (FP16)
- **Response Time**: 2-5 seconds per response
- **GPU Memory**: ~6-8GB usage
- **Context Length**: Up to 1024 tokens

## 🔧 **Troubleshooting**

### **If you get memory errors:**
```python
# Add this cell to clear GPU memory
import gc
torch.cuda.empty_cache()
gc.collect()
```

### **If model loading fails:**
1. Ensure GPU runtime is enabled
2. Restart runtime and try again
3. Check internet connection

### **If Gradio doesn't launch:**
1. Try rerunning the launch cell
2. Check for any error messages
3. Restart runtime if needed

## 🎓 **Usage Tips**

### **For Better Responses:**
- Be specific in your questions
- Provide context when needed
- Experiment with temperature settings
- Use clear, well-structured prompts

### **Parameter Guidelines:**
- **Temperature 0.3-0.5**: Factual responses
- **Temperature 0.7-1.0**: Balanced creativity
- **Temperature 1.2-2.0**: Highly creative
- **Top-p 0.9**: Good for most tasks

## 🌟 **Example Prompts to Try**

1. **Educational**: "Explain machine learning in simple terms"
2. **Coding**: "Write a Python function to calculate fibonacci"
3. **Creative**: "Write a haiku about artificial intelligence"
4. **Analysis**: "What are the pros and cons of renewable energy?"
5. **Problem Solving**: "How can I improve my study habits?"

**Your Granite AI application will be ready in under 5 minutes! 🚀✨**
