import os
import re
from pypdf import PdfReader

class DocumentIngestor:
    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 120):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract all the text from the local PDF file
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"No PDF file was found: {pdf_path}")
            
        reader = PdfReader(pdf_path)
        full_text = []
        
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
                
        # Concatenate the text of all pages using line breaks
        return "\n\n".join(full_text)

    def split_to_chunks(self, text: str) -> list[str]:
      """
      bilingual slicing: Perfectly handles both Chinese and English punctuation, preventing the splitting of English abbreviations and numbers
      """
      # 1. First, divide the text into large paragraphs (\n\n)
      paragraphs = text.split("\n\n")

      if len(paragraphs) <= 2 and len(text) > self.chunk_size:
        paragraphs = text.split("\n")

      chunks = []
      current_chunk = ""

      for para in paragraphs:
          para = para.strip()
          if not para:
              continue

          # If the individual segments do not add up to an excessively long duration, simply combine them.
          if len(current_chunk) + len(para) <= self.chunk_size:
              current_chunk += ("\n\n" + para if current_chunk else para)
          else:
              # The preparations are almost complete. finish up the current packaging first.
              if current_chunk:
                  chunks.append(current_chunk)
              
              # Handling Overlap: Go back a relatively complete sentence in the forward direction
              if len(current_chunk) > self.chunk_overlap:
                  overlap_start = current_chunk[-self.chunk_overlap:]
                  
                  # Use regular expressions to find the appropriate boundaries of Chinese and English sentences
                  # Match: Chinese period/question mark/exclamation mark, or English period/question mark/exclamation mark followed by a space or a line break.
                  boundaries = [m.start() for m in re.finditer(r'([。？！]|[\.\?\!](?=\s|$))', overlap_start)]
                  
                  if boundaries:
                      boundary = boundaries[-1] # Take the nearest complete sentence boundary to the end.
                      current_chunk = overlap_start[boundary + 1:] + "\n\n" + para
                  else:
                      current_chunk = overlap_start + "\n\n" + para
              else:
                  current_chunk = para

      if current_chunk:
          chunks.append(current_chunk)

      return chunks

# === Module test entry ===
if __name__ == "__main__":
    ingestor = DocumentIngestor(chunk_size=300, chunk_overlap=50)
    print("🚀 DocumentIngestor Component initialization was successful and it can be called by FastAPI at any time!")