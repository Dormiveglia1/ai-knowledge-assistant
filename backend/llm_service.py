import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=False)
class LLMService:
    def __init__(self):
      ai_mode = os.getenv("AI_MODE", "LOCAL").upper()
      """
      Initialize the client of the large model
      """

      if ai_mode == "CLOUD":
        api_key = os.getenv("CLOUD_API_KEY")
        base_url = os.getenv("CLOUD_BASE_URL")
        # Connect GPT cloud service
        self.client = OpenAI(api_key=api_key, base_url=base_url if base_url else "https://api.openai.com/v1")
        self.default_model = "gpt-4o-mini"
        print("🧠 The model has been switched to: [Cloud GPT-4o-mini]")
      else:
        # Connect the local Ollama
        api_key = os.getenv("OLLAMA_API_KEY", "ollama")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.default_model = "llama3:8b"
        print("🦙 The model has been switched to: [Local Offline Llama3]")


    def generate_answer(self, query: str, contexts: list[str]) -> str:
      """
      Combine the local knowledge (Context) retrieved and the user's question, and assemble the Prompt to feed to the AI.
      """
      # 1. Assembling reference background knowledge
      formatted_context = "\n\n".join([f"[Reference snippet {i+1}]: {text}" for i, text in enumerate(contexts)])
      
      # 2. Develop extremely strict system-level Prompt Template (prompt template)
      system_prompt = (
          "You are a smart and meticulous AI knowledge base assistant.\n"
          "Please carefully read the provided [Reference Background Knowledge] below, and answer the user's questions based on this information.\n"
          "---------------------\n"
          f"【Reference background knowledge】:\n{formatted_context}\n"
          "---------------------\n"
          "【Hard constraints】:\n"
          "1.Your answer must be entirely based on the [reference background knowledge] provided above. It cannot be fabricated randomly or incorporate any unrelated common sense that you already know.\n"
          "2.If the user's question cannot be found any relevant information in the [Reference Background Knowledge] section, please politely reply: 'Sorry, I couldn't find any relevant records for this question in my current knowledge base.' Do not fabricate any false information! \n"
          "3. Please provide your answer in a clear and organized manner, with a professional and rigorous tone."
      )
      
      try:
          # 3. Initiate a request for a large model conversation
          response = self.client.chat.completions.create(
              model=self.default_model,
              messages=[
                  {"role": "system", "content": system_prompt},
                  {"role": "user", "content": query}
              ],
              temperature=0.2 # Reduce the randomness and have the AI follow the reference materials more rigidly.
          )
          return response.choices[0].message.content
          
      except Exception as e:
          return f"❌ Error occurred during the invocation of the large model: {str(e)}"