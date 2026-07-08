import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Upload,
  Bot,
  User,
  CheckCircle,
  AlertCircle,
  Loader,
  Layers,
  Cpu,
  Trash2,
} from "lucide-react";

function App() {
  // === State Management ===
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);

  // File isolation & management states
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(""); // Empty string means "Search All Files"

  // Backend Api Base URL
  const BACKEND_URL = "http://localhost:8000";

  // === Fetch & Synchronize File List from ChromaDB ===
  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/files`);
      setAvailableFiles(response.data.files || []);
    } catch (error) {
      console.error("Failed to fetch file list:", error);
    }
  };

  // Sync files on initial component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle local file picker changes
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus("");
    }
  };

  // Interaction 1: Upload and trigger RAG ingestion (chunking & embedding)
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("❌ Please select a PDF file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setUploadStatus("⏳ Ingesting document into vector store, please wait...");

    try {
      const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅ Knowledge base updated successfully!`);

      // Auto-refresh drop-down menu and automatically focus on the newly uploaded file
      await fetchFiles();
      setSelectedFile(response.data.filename);
      setFile(null); // Clear file input state after successful upload
    } catch (error) {
      console.error(error);
      const errorMsg =
        error.response?.data?.detail ||
        "Ingestion failed. Check backend status.";
      setUploadStatus(`❌ Error: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Interaction 2: Send User Query to the RAG backend (with active source filter)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Append user message to the conversation container
    const userMessage = { role: "user", text: query };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");
    setIsChatting(true);

    try {
      // POST payload carrying query text and optional targeted file restriction
      const response = await axios.post(`${BACKEND_URL}/api/chat`, {
        query: currentQuery,
        current_file: selectedFile || null,
      });

      // Append AI response along with retrieved ground-truth sources
      const aiMessage = {
        role: "assistant",
        text: response.data.answer,
        sources: response.data.sources,
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "❌ Error: Failed to retrieve answer from local LLM. Please verify backend uptime.",
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // Interaction 3: Delete/Evict target document from vector storage and file system
  const handleDeleteFile = async () => {
    if (!selectedFile) {
      alert(
        "Please select a specific file from the drop-down menu to delete.\nGlobal Search mode cannot be deleted.",
      );
      return;
    }

    if (
      !window.confirm(
        `⚠️ WARNING: Are you sure you want to completely evict [${selectedFile}] from both the database and server storage? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setUploadStatus(`⏳ Evicting [${selectedFile}] from vector store...`);

    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/files/${encodeURIComponent(selectedFile)}`,
      );
      setUploadStatus(`✅ ${response.data.message}`);

      // Reset target view and pull the fresh file index from backend
      setSelectedFile("");
      await fetchFiles();
    } catch (error) {
      console.error(error);
      const errorMsg =
        error.response?.data?.detail || "Failed to evict document.";
      setUploadStatus(`❌ Error: ${errorMsg}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        fontFamily: "Segoe UI, sans-serif",
        backgroundColor: "#f3f4f6",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* 👈 Left Sidebar: Control Panel (Knowledge Base Management) */}
      <div
        style={{
          width: "360px",
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Layers size={28} color="#2563eb" />
          <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2937" }}>
            RAG Workspace
          </h2>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            margin: 0,
            lineHeight: "1.5",
          }}
        >
          Multi-document isolated RAG engine. Upload your knowledge assets below
          and segment context domains effortlessly.
        </p>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #f3f4f6",
            margin: "4px 0",
          }}
        />

        {/* 🎯 100% FORCE CORESIDENT CONTEXT SELECTOR ZONE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "100%",
          }}
        >
          <label
            style={{ fontSize: "13px", fontWeight: "bold", color: "#4b5563" }}
          >
            Query Context Domain Target:
          </label>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* 🌐 Forced Persistent Selector Dropdown */}
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                fontSize: "13px",
                color: "#1f2937",
                outline: "none",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                minWidth: "0",
              }}
            >
              <option value="">🌐 Global Search (All Documents)</option>
              {availableFiles &&
                availableFiles.length > 0 &&
                availableFiles.map((filename, idx) => (
                  <option key={idx} value={filename}>
                    📄 Only: {filename}
                  </option>
                ))}
            </select>

            {/* 🗑️ 100% Forced Persistent Trash Button */}
            <button
              onClick={handleDeleteFile}
              type="button"
              title="Evict this document permanently"
              style={{
                padding: "10px 12px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fee2e2",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#fee2e2";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#fef2f2";
              }}
            >
              <Trash2 size={16} color="#dc2626" />
            </button>
          </div>
        </div>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #f3f4f6",
            margin: "4px 0",
          }}
        />

        {/* File Drag & Drop Upload Zone */}
        <div
          style={{
            border: "2px dashed #d1d5db",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#fafafa",
          }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            id="pdf-file"
            style={{ display: "none" }}
          />
          <label
            htmlFor="pdf-file"
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              color: "#4b5563",
              fontSize: "13px",
            }}
          >
            <Upload size={32} color="#9ca3af" />
            <span style={{ wordBreak: "break-all", padding: "0 4px" }}>
              {file ? file.name : "Choose a new PDF document"}
            </span>
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          style={{
            width: "100%",
            padding: "11px",
            backgroundColor: file && !isUploading ? "#2563eb" : "#9ca3af",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: file && !isUploading ? "pointer" : "not-allowed",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
          }}
        >
          {isUploading ? (
            <Loader
              size={18}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : null}
          {isUploading ? "Ingesting Assets..." : "Inject into Vector DB"}
        </button>

        {/* Real-time Status Notification Feed */}
        {uploadStatus && (
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              fontSize: "13px",
              lineHeight: "1.4",
              backgroundColor:
                uploadStatus.includes("❌") || uploadStatus.includes("Error")
                  ? "#fef2f2"
                  : "#ecfdf5",
              color:
                uploadStatus.includes("❌") || uploadStatus.includes("Error")
                  ? "#991b1b"
                  : "#065f46",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
            }}
          >
            {uploadStatus.includes("❌") || uploadStatus.includes("Error") ? (
              <AlertCircle
                size={16}
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
            ) : (
              <CheckCircle
                size={16}
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
            )}
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* 👉 Right Panel: AI Generation Console & Chat View */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f9fafb",
          height: "100%",
        }}
      >
        {/* Top Header Navigation Strip */}
        <div
          style={{
            height: "60px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#1f2937",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Bot color="#2563eb" size={20} /> AI Agent Copilot
          </h3>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#6b7280",
              backgroundColor: "#f3f4f6",
              padding: "4px 10px",
              borderRadius: "20px",
            }}
          >
            <Cpu size={14} color="#10b981" />
            <span>Dual-Drive Adaptive Core Connected</span>
          </div>
        </div>

        {/* Chronological Chat Message Scroller */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {chatHistory.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#9ca3af",
                gap: "10px",
              }}
            >
              <Bot size={48} color="#cbd5e1" />
              <p style={{ margin: 0, fontSize: "14px" }}>
                System deployed. Upload documents or start asking global
                semantic queries below!
              </p>
            </div>
          ) : (
            chatHistory.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#dbeafe",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={20} color="#2563eb" />
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    maxWidth: "75%",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      fontSize: "15px",
                      lineHeight: "1.6",
                      backgroundColor:
                        msg.role === "user" ? "#2563eb" : "#ffffff",
                      color: msg.role === "user" ? "#ffffff" : "#1f2937",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* RAG Core Value: Document Traceability Block Sources */}
                  {msg.role === "assistant" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          padding: "10px",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#4b5563",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <span style={{ fontWeight: "bold", color: "#374151" }}>
                          🔍 Traceability Sources:
                        </span>
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              borderLeft: "3px solid #2563eb",
                              paddingLeft: "8px",
                              margin: "4px 0",
                              lineHeight: "1.4",
                            }}
                          >
                            <span
                              style={{ fontWeight: "600", color: "#1f2937" }}
                            >
                              [{src.id.split("_chunk_")[0]}]
                            </span>
                            <span
                              style={{ color: "#6b7280", marginLeft: "6px" }}
                            >
                              (Distance Score: {Number(src.score).toFixed(3)})
                            </span>
                            <p
                              style={{
                                margin: "2px 0 0 0",
                                fontStyle: "italic",
                              }}
                            >
                              "{src.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {msg.role === "user" && (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#2563eb",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <User size={20} color="#ffffff" />
                  </div>
                )}
              </div>
            ))
          )}
          {isChatting && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#dbeafe",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Bot size={20} color="#2563eb" />
              </div>
              <span
                style={{
                  fontSize: "13px",
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Loader
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Agent scanning vector database shards and synthesizing
                response...
              </span>
            </div>
          )}
        </div>

        {/* Bottom Context Command Input Bar */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={handleSendMessage}
            style={{ display: "flex", gap: "12px" }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                selectedFile
                  ? `Context locked onto [${selectedFile}]. Ask anything...`
                  : "Submit global query across entire knowledge base..."
              }
              disabled={isChatting}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isChatting || !query.trim()}
              style={{
                padding: "0 18px",
                backgroundColor:
                  query.trim() && !isChatting ? "#2563eb" : "#9ca3af",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: query.trim() && !isChatting ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyURI: "center",
              }}
            >
              <Send size={18} color="#ffffff" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
