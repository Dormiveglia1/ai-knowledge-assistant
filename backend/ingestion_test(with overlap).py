import os

class AdvancedChunker:
    def __init__(self, chunk_size: int = 150, chunk_overlap: int = 40):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Define the priority of the delimiter for recursive splitting. Define the priority of the delimiter for recursive splitting.
        self.separators = ["\n\n", "\n", "。", "！", "？", " ", ""]

    def split_text(self, text: str) -> list[str]:
        return self._split(text, self.separators)

    def _split(self, text: str, separators: list[str]) -> list[str]:
        # 如果文本本身已经小于 chunk_size，直接返回
        if len(text) <= self.chunk_size:
            return [text]

        # 选择当前最高优先级的分隔符
        import re
        if not separators:
            return [text]
            
        separator = separators[0]
        next_selectors = separators[1:]
        
        # 按分隔符切开
        if separator == "":
            splits = list(text)
        else:
            splits = text.split(separator)

        chunks = []
        current_doc = ""

        for split in splits:
            # 如果加上新碎片超长了
            if len(current_doc) + len(split) > self.chunk_size:
                if current_doc:
                    chunks.append(current_doc.strip())
                
                # 【核心：处理 Overlap 重叠区】
                # 我们不再直接清空，而是保留当前片段末尾的 chunk_overlap 个字符，作为下一个 chunk 的开头
                if len(current_doc) > self.chunk_overlap:
                    current_doc = current_doc[-self.chunk_overlap:] + split
                else:
                    current_doc = split
            else:
                current_doc += (separator + split if current_doc else split)

        if current_doc:
            chunks.append(current_doc.strip())

        return chunks

# === 测试数据 ===
if __name__ == "__main__":
    chunker = AdvancedChunker(chunk_size=100, chunk_overlap=30)
    
    sample_text = (
        "人工智能（AI）是计算机科学的一个分支。它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。\n\n"
        "在大模型时代，RAG（检索增强生成）技术变得尤为重要。简单的说，RAG 就是给大模型配置一个翻书的助手。 "
        "当用户提出问题时，助手先去本地的知识库里查找相关的文档，然后把这些文档摘要和小模型一起组合，最终生成有据可查的回答。 "
        "这种方法极大地缓解了大模型的‘幻觉’问题，让 AI 在企业私有数据问答中落地成为可能。\n\n"
        "今天我们正在一步步实现这个系统，包括环境安装、文本切片、向量数据库存储以及最后的 FastAPI 接口开发。"
    )
    
    results = chunker.split_text(sample_text)
    
    print("--- 带 Overlap 的切片测试 ---")
    for i, chunk in enumerate(results):
        print(f"\n[Chunk {i+1}] (长度: {len(chunk)}):")
        print(chunk)
        print("-" * 20)