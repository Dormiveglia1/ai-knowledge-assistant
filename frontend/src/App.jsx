// npm run dev
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bot, Cpu, Lock, User, KeyRound, ShieldAlert } from "lucide-react";

// import the three core sharded parts
import Workspace from "./components/Workspace";
import ChatConsole from "./components/ChatConsole";
import ChatInput from "./components/ChatInput";

function App() {
  // === 🧠 Central Brain State Control ===
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");

  const BACKEND_URL = "http://localhost:8000";

  // === 🔐 Authentication & Security States ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false); // Toggles between Login and Register views
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState("");

  // 🛃 【无状态令牌提取机关】 Extract token bearer from disk storage sharding
  const getAuthHeaders = () => {
    const token = localStorage.getItem("rag_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // === ⚙️ Core Actions (Handlers) ===
  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/files`, {
        headers: getAuthHeaders(),
      });
      setAvailableFiles(response.data.files || []);
    } catch (error) {
      console.error("Failed to fetch file list:", error);
      // Force user out if token signatures are corrupted or expired
      if (error.response?.status === 401) handleLogout();
    }
  };

  // 👮 Boot-up validation sequence (Auto免登录安检)
  useEffect(() => {
    const savedToken = localStorage.getItem("rag_token");
    const savedUser = localStorage.getItem("rag_user");
    if (savedToken && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
      fetchFiles();
    }
  }, [isAuthenticated]);

  // 🎫 Authentication Form Dispatcher (登录与注册提交控制枢纽)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    // Front-end early boundaries safety check matching backend constraints
    if (authUsername.length < 3) {
      setAuthError("❌ Username must be at least 3 characters.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("❌ Password must be at least 6 characters.");
      return;
    }

    const endpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";

    try {
      const response = await axios.post(`${BACKEND_URL}${endpoint}`, {
        username: authUsername,
        password: authPassword,
      });

      if (isRegisterMode) {
        // Condition A: Registration successful
        alert(`✅ ${response.data.message}`);
        setIsRegisterMode(false); // Pivot user automatically to login panel view
        setAuthPassword("");
      } else {
        // Condition B: Login successful -> Persist payload permanently into browser storage
        localStorage.setItem("rag_token", response.data.token);
        localStorage.setItem("rag_user", response.data.username);
        setCurrentUser(response.data.username);
        setIsAuthenticated(true);
        // Clear input credentials buffer for local security protection
        setAuthUsername("");
        setAuthPassword("");
      }
    } catch (error) {
      // Catch and surface standard relational constraints errors from SQLite backend
      setAuthError(
        `❌ ${error.response?.data?.detail || "Authentication sequence disrupted."}`,
      );
    }
  };

  // 🗑️ One-Click physical session erasure
  const handleLogout = () => {
    localStorage.removeItem("rag_token");
    localStorage.removeItem("rag_user");
    setIsAuthenticated(false);
    setCurrentUser("");
    setChatHistory([]);
    setAvailableFiles([]);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus("⏳ Ingesting document into vector store, please wait...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });
      setUploadStatus(`✅ Knowledge base updated successfully!`);
      fetchFiles();
      setSelectedFile(response.data.filename);
      setFile(null);
    } catch (error) {
      setUploadStatus(
        `❌ Error: ${error.response?.data?.detail || "Ingestion failed."}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: "user", text: query };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");
    setIsChatting(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/chat`,
        { query: currentQuery, current_file: selectedFile || null },
        { headers: getAuthHeaders() },
      );

      // 检查后端返回的数据结构是否匹配
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            response.data.answer || response.data.response || "未收到回复文本",
          sources: response.data.sources || [],
        },
      ]);
    } catch (error) {
      // 🚨 关键：把真正的错误打印在控制台，不要吞掉
      console.error("Chat API Error Detailed:", error);

      // 提取后端的详细错误提示
      const errorMessage =
        error.response?.data?.detail || "Error connecting to local LLM.";

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: `❌ ${errorMessage}` },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) {
      alert("Please select a specific file from the drop-down menu to delete.");
      return;
    }
    if (
      !window.confirm(
        `⚠️ WARNING: Are you sure you want to completely evict [${selectedFile}]?`,
      )
    )
      return;

    setUploadStatus(`⏳ Evicting [${selectedFile}]...`);
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/files/${encodeURIComponent(selectedFile)}`,
        { headers: getAuthHeaders() },
      );
      setUploadStatus(`✅ ${response.data.message}`);
      setSelectedFile("");
      fetchFiles();
    } catch (error) {
      setUploadStatus(`❌ Error evicting document.`);
    }
  };

  // === 🎨 Modern Modular Render Engine ===
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
        position: "relative", // Crucial for embedding authentication cover layers
      }}
    >
      {/* 👈 Left Block: Workspace Component */}
      <Workspace
        file={file}
        uploadStatus={uploadStatus}
        isUploading={isUploading}
        availableFiles={availableFiles}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        handleFileChange={handleFileChange}
        handleUpload={handleUpload}
        handleDeleteFile={handleDeleteFile}
      />

      {/* 👉 Right Block: AI Agent Interactive Window */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f9fafb",
          height: "100%",
        }}
      >
        {/* Header Navigation Strip */}
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
              gap: "14px",
            }}
          >
            {/* 🌟 Dynamic User identity tag & Sign Out action hook */}
            {isAuthenticated && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#4b5563",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                  }}
                ></span>
                <span>
                  User: <b>{currentUser}</b>
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    marginLeft: "6px",
                    padding: "2px 8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: "#ef4444",
                    fontWeight: "bold",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}

            <div
              style={{
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
        </div>

        {/* Console Content Scroller */}
        <ChatConsole chatHistory={chatHistory} isChatting={isChatting} />

        {/* Input Dock Bar */}
        <ChatInput
          query={query}
          setQuery={setQuery}
          handleSendMessage={handleSendMessage}
          isChatting={isChatting}
          selectedFile={selectedFile}
        />
      </div>

      {/* ========================================================================= */}
      {/* 🔐 HIGH-TECH GLASSMORPHISM INTERCEPTOR CORDONS (磨砂玻璃城墙弹窗)        */}
      {/* ========================================================================= */}
      {!isAuthenticated && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(243, 244, 246, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "380px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: "40px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              border: "1px solid #f3f4f6",
            }}
          >
            <div
              style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Lock size={24} color="#2563eb" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {isRegisterMode ? "Create RAG Account" : "RAG Secure Gateway"}
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                {isRegisterMode
                  ? "Register rows to secure physical SQLite ledger partitions."
                  : "Authentication required to establish database pipeline."}
              </p>
            </div>

            <form
              onSubmit={handleAuthSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#4b5563",
                  }}
                >
                  Username
                </span>
                <div style={{ position: "relative" }}>
                  <User
                    size={15}
                    color="#9ca3af"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="min 3 characters"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      boxSizing: "border-box",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#4b5563",
                  }}
                >
                  Password
                </span>
                <div style={{ position: "relative" }}>
                  <KeyRound
                    size={15}
                    color="#9ca3af"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="min 6 characters"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      boxSizing: "border-box",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {authError && (
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fee2e2",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#991b1b",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "11px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginTop: "6px",
                }}
              >
                {isRegisterMode ? "Sign Up" : "Sign In"}
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              {isRegisterMode
                ? "Already have an account? "
                : "Don't have an account? "}
              <span
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setAuthError("");
                }}
                style={{
                  color: "#2563eb",
                  fontWeight: "bold",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isRegisterMode ? "Sign In here" : "Sign Up here"}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
    </div>
  );
}

export default App;
