import os

def recursive_chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """
    A lightweight recursive character slicer  
   Priority: paragraphs (\n\n) -> newlines (\n) -> spaces ( ) -> characters ()
    """
    chunks = []
    
    # 1. First, split the text into paragraphs.
    paragraphs = text.split("\n\n")
    current_chunk = ""
    
    for para in paragraphs:
        # If a single segment exceeds the specified size, we fall back to splitting by line breaks or spaces.
        if len(para) > chunk_size:
            lines = para.split("\n")
            for line in lines:
                if len(current_chunk) + len(line) + 1 <= chunk_size:
                    current_chunk += (line + "\n")
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = line + "\n"
        else:
            if len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk += (para + "\n\n")
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
                
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

# === Test data ===
if __name__ == "__main__":
    # Simulate a long text read from a PDF file
    sample_text = (
        "人工智能（AI）是计算机科学的一个分支。它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。\n\n"
        "在大模型时代，RAG（检索增强生成）技术变得尤为重要。简单的说，RAG 就是给大模型配置一个翻书的助手。 "
        "当用户提出问题时，助手先去本地的知识库里查找相关的文档，然后把这些文档摘要和小模型一起组合，最终生成有据可查的回答。 "
        "这种方法极大地缓解了大模型的‘幻觉’问题，让 AI 在企业私有数据问答中落地成为可能。\n\n"
        "今天我们正在一步步实现这个系统，包括环境安装、文本切片、向量数据库存储以及最后的 FastAPI 接口开发。"
    )
    
    print("--- Original text length ---")
    print(f"Total character count: {len(sample_text)}")
    
    # Intentionally set the chunk_size to a smaller value (for example, 100 characters), and observe the slicing effect
    test_chunks = recursive_chunk_text(sample_text, chunk_size=100, chunk_overlap=10)
    
    print("\n--- The sliced result ---")
    for i, chunk in enumerate(test_chunks):
        print(f"\n[Chunk {i+1}] (length: {len(chunk)}):")
        print(chunk)
        print("-" * 20)