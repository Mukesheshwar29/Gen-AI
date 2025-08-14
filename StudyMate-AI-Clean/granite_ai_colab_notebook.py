# 🚀 Granite 3.2 2B Instruct AI Application with Gradio
# Complete Google Colab Notebook Code
# Copy and paste each cell into Google Colab

# ============================================================================
# CELL 1: Install Required Libraries
# ============================================================================

!pip install transformers torch gradio accelerate bitsandbytes -q

print("✅ All libraries installed successfully!")

# ============================================================================
# CELL 2: Import Libraries and Setup
# ============================================================================

import torch
import gradio as gr
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import warnings
import gc
warnings.filterwarnings("ignore")

# Check if GPU is available
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 Using device: {device}")
print(f"🔥 GPU Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU'}")
print(f"🔥 Available GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if torch.cuda.is_available() else "")

# ============================================================================
# CELL 3: Load Granite 3.2 2B Instruct Model
# ============================================================================

# Model configuration
model_name = "ibm-granite/granite-3.2-2b-instruct"

print("🤖 Loading Granite 3.2 2B Instruct model...")
print("⏳ This may take 2-3 minutes...")

try:
    # Load tokenizer
    print("📝 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Add padding token if not present
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model with optimization for Colab
    print("🧠 Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,  # Use half precision for memory efficiency
        device_map="auto",          # Automatically map to available devices
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )
    
    print("✅ Granite 3.2 2B Instruct model loaded successfully!")
    print(f"📊 Model parameters: ~2B")
    print(f"💾 Model size: ~4GB (FP16)")
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("💡 Try restarting runtime and ensuring GPU is enabled")

# ============================================================================
# CELL 4: Create Text Generation Functions
# ============================================================================

def generate_response(prompt, max_length=512, temperature=0.7, top_p=0.9, do_sample=True):
    """
    Generate response using Granite 3.2 2B Instruct
    """
    try:
        # Format prompt for instruction following
        formatted_prompt = f"<|user|>\n{prompt}\n<|assistant|>\n"
        
        # Tokenize input
        inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True, max_length=1024)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=do_sample,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        # Decode response
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the assistant's response
        if "<|assistant|>" in full_response:
            response = full_response.split("<|assistant|>")[-1].strip()
        else:
            response = full_response.replace(formatted_prompt, "").strip()
        
        return response
        
    except Exception as e:
        return f"❌ Error generating response: {str(e)}"

# Test the function
print("🧪 Testing text generation...")
test_response = generate_response("Hello! How are you today?", max_length=100)
print(f"🤖 Test Response: {test_response}")

# ============================================================================
# CELL 5: Create Advanced Gradio Interface
# ============================================================================

# Conversation history storage
conversation_history = []

def chat_with_granite(message, history, max_length, temperature, top_p):
    """
    Enhanced chat function with conversation history
    """
    global conversation_history
    
    if not message.strip():
        return history, ""
    
    # Add user message to history
    conversation_history.append({"role": "user", "content": message})
    
    # Generate response
    response = generate_response(message, max_length, temperature, top_p)
    
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

def set_example_prompt(prompt):
    """Set example prompt in the textbox"""
    return prompt

# ============================================================================
# CELL 6: Launch Gradio Interface
# ============================================================================

# Create Gradio interface
with gr.Blocks(
    title="🚀 Granite 3.2 2B AI Assistant", 
    theme=gr.themes.Soft(),
    css="""
    .gradio-container {
        max-width: 1200px !important;
    }
    .chat-message {
        border-radius: 10px !important;
    }
    """
) as demo:
    
    gr.Markdown("""
    # 🚀 Granite 3.2 2B AI Assistant
    
    **Powered by IBM's Granite 3.2 2B Instruct Model via Hugging Face**
    
    This AI assistant can help you with:
    - ✅ **Answering questions** and providing detailed explanations
    - ✅ **Creative writing** and content generation  
    - ✅ **Code assistance** and programming help
    - ✅ **Analysis and problem-solving**
    - ✅ **General conversation** and chat
    - ✅ **Educational support** and tutoring
    
    *Adjust the parameters in the sidebar to customize the AI's responses!*
    """)
    
    with gr.Row():
        with gr.Column(scale=3):
            # Main chat interface
            chatbot = gr.Chatbot(
                label="💬 Chat with Granite AI",
                height=500,
                show_label=True,
                container=True,
                bubble_full_width=False
            )
            
            with gr.Row():
                msg = gr.Textbox(
                    label="Your Message",
                    placeholder="Type your message here... (e.g., 'Explain quantum computing' or 'Write a Python function')",
                    lines=3,
                    scale=4,
                    container=True
                )
                send_btn = gr.Button("Send 🚀", variant="primary", scale=1, size="lg")
            
            with gr.Row():
                clear_btn = gr.Button("Clear Chat 🗑️", variant="secondary", size="sm")
        
        with gr.Column(scale=1):
            # Parameters panel
            gr.Markdown("### ⚙️ Generation Parameters")
            
            max_length = gr.Slider(
                minimum=50,
                maximum=1024,
                value=512,
                step=50,
                label="Max Response Length",
                info="Maximum number of tokens in response"
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
                label="Top-p (Nucleus Sampling)",
                info="Diversity of word selection"
            )
            
            gr.Markdown("""
            ### 💡 Parameter Tips:
            - **Temperature 0.3-0.5**: Factual, focused responses
            - **Temperature 0.7-1.0**: Balanced creativity
            - **Temperature 1.2-2.0**: Highly creative writing
            - **Top-p 0.9**: Good balance for most tasks
            """)
    
    # Example prompts section
    gr.Markdown("### 🎯 Example Prompts to Try:")
    
    example_prompts = [
        "Explain machine learning in simple terms",
        "Write a Python function to sort a list",
        "What are the benefits of renewable energy?",
        "Create a short story about space exploration",
        "How does photosynthesis work?",
        "Write a professional email template"
    ]
    
    with gr.Row():
        for prompt in example_prompts[:3]:
            gr.Button(prompt, size="sm").click(
                fn=lambda p=prompt: p,
                outputs=msg
            )
    
    with gr.Row():
        for prompt in example_prompts[3:]:
            gr.Button(prompt, size="sm").click(
                fn=lambda p=prompt: p,
                outputs=msg
            )
    
    # Event handlers
    send_btn.click(
        fn=chat_with_granite,
        inputs=[msg, chatbot, max_length, temperature, top_p],
        outputs=[chatbot, msg]
    )
    
    msg.submit(
        fn=chat_with_granite,
        inputs=[msg, chatbot, max_length, temperature, top_p],
        outputs=[chatbot, msg]
    )
    
    clear_btn.click(
        fn=clear_conversation,
        outputs=chatbot
    )
    
    # Footer
    gr.Markdown("""
    ---
    **Model**: IBM Granite 3.2 2B Instruct | **Framework**: Hugging Face Transformers | **Interface**: Gradio
    
    💡 **Tips for better responses:**
    - Be specific in your questions
    - Provide context when needed
    - Experiment with different temperature settings
    - Use clear, well-structured prompts
    """)

# Launch the interface
print("🚀 Launching Granite AI Assistant...")
print("⏳ Starting Gradio interface...")

try:
    demo.launch(
        share=True,              # Create public shareable link
        debug=True,              # Enable debug mode
        server_name="0.0.0.0",   # Allow external access
        server_port=7860,        # Default Gradio port
        show_error=True,         # Show errors in interface
        quiet=False              # Show startup logs
    )
except Exception as e:
    print(f"❌ Error launching interface: {e}")
    print("💡 Try restarting the runtime if you encounter issues")

# ============================================================================
# CELL 7: Memory Management (Optional - Run if needed)
# ============================================================================

def clear_gpu_memory():
    """Clear GPU memory cache"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
        print("🧹 GPU memory cleared")
    else:
        print("ℹ️ No GPU available to clear")

def check_gpu_memory():
    """Check current GPU memory usage"""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / 1e9
        cached = torch.cuda.memory_reserved() / 1e9
        total = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"📊 GPU Memory - Allocated: {allocated:.1f}GB, Cached: {cached:.1f}GB, Total: {total:.1f}GB")
    else:
        print("ℹ️ No GPU available")

# Run memory check
check_gpu_memory()

print("""
🎉 **Granite AI Assistant is Ready!**

📋 **What you can do:**
1. Chat with the AI using the interface above
2. Adjust parameters for different response styles
3. Try the example prompts to get started
4. Share the public link with others
5. Clear memory if needed using the functions below

🔗 **Your app is now live and accessible via the public Gradio link!**
""")

# ============================================================================
# END OF NOTEBOOK
# ============================================================================
