#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// 1. Parse arguments
const mdFilePath = process.argv[2];
const profile = process.argv[3] || '';

if (!mdFilePath) {
  console.log(`
Usage:
  node preview-markdown.js <path-to-markdown-file> [chrome-profile]

Examples:
  node preview-markdown.js README.md
  node preview-markdown.js README.md personal
  node preview-markdown.js README.md adobe
`);
  process.exit(1);
}

// 2. Resolve absolute path
const absoluteMdPath = path.resolve(mdFilePath);

if (!fs.existsSync(absoluteMdPath)) {
  console.error(`Error: File does not exist at "${absoluteMdPath}"`);
  process.exit(1);
}

// 3. Read file contents
let markdownContent = '';
try {
  markdownContent = fs.readFileSync(absoluteMdPath, 'utf8');
} catch (error) {
  console.error(`Error: Failed to read file at "${absoluteMdPath}"`, error);
  process.exit(1);
}

// Get stats
const fileName = path.basename(absoluteMdPath);
const mdDirectory = path.dirname(absoluteMdPath);
const fileStats = fs.statSync(absoluteMdPath);
const lastModified = fileStats.mtime.toLocaleString();
const fileSizeKB = (fileStats.size / 1024).toFixed(1);

// Escape content for JS string
const encodedMarkdown = encodeURIComponent(markdownContent);

// 4. Generate HTML template
const htmlContent = `<!DOCTYPE html>
<html lang="en" data-color-mode="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - Review Mode</title>
  
  <!-- CSS Library - GitHub Markdown -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  
  <!-- Highlight.js Stylesheets -->
  <link id="hljs-light" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <link id="hljs-dark" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" disabled>
  
  <!-- FontAwesome for Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- JS Libraries -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>

  <style>
    :root {
      --font-ui: 'Outfit', 'Inter', sans-serif;
      --font-mono: 'Fira Code', monospace;
      --transition-speed: 0.3s;
    }

    [data-color-mode="light"] {
      --bg-app: #f6f8fa;
      --bg-sidebar: rgba(255, 255, 255, 0.85);
      --border-color: #d0d7de;
      --text-main: #24292f;
      --text-muted: #57606a;
      --bg-glass: rgba(255, 255, 255, 0.7);
      --accent-color: #0969da;
      --accent-hover: #0550ae;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
      --scrollbar-thumb: #d0d7de;
      --scrollbar-track: #f6f8fa;
      --kbd-bg: #f6f8fa;
    }

    [data-color-mode="dark"] {
      --bg-app: #0d1117;
      --bg-sidebar: rgba(22, 27, 34, 0.85);
      --border-color: #30363d;
      --text-main: #c9d1d9;
      --text-muted: #8b949e;
      --bg-glass: rgba(22, 27, 34, 0.7);
      --accent-color: #58a6ff;
      --accent-hover: #1f6feb;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.4);
      --scrollbar-thumb: #30363d;
      --scrollbar-track: #0d1117;
      --kbd-bg: #161b22;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-ui);
      background-color: var(--bg-app);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      transition: background-color var(--transition-speed), color var(--transition-speed);
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }

    /* Sidebar Styling */
    .sidebar {
      width: 320px;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      overflow-y: auto;
      border-right: 1px solid var(--border-color);
      background: var(--bg-sidebar);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 28px;
      z-index: 100;
      transition: transform var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1), background-color var(--transition-speed), border-color var(--transition-speed);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-icon {
      font-size: 20px;
      color: var(--accent-color);
    }

    /* Search Box */
    .search-box {
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      font-family: var(--font-ui);
      font-size: 14px;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-main);
      outline: none;
      transition: all 0.2s ease;
    }
    [data-color-mode="dark"] .search-input {
      background: rgba(255, 255, 255, 0.02);
    }
    .search-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
      background: #fff;
    }
    [data-color-mode="dark"] .search-input:focus {
      background: #161b22;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
    }

    /* Stats Card */
    .stats-card {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
    }
    [data-color-mode="dark"] .stats-card {
      background: rgba(255, 255, 255, 0.02);
    }
    .stats-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 12px;
      letter-spacing: 0.8px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }
    .stat-lbl {
      font-size: 11px;
      color: var(--text-muted);
    }
    
    .file-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed var(--border-color);
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Table of Contents */
    .toc-container {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      min-height: 0; /* allows scrolling */
    }
    
    .toc-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }

    .toc-wrapper {
      overflow-y: auto;
      flex-grow: 1;
      padding-right: 4px;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      margin-bottom: 4px;
    }

    .toc-link {
      display: block;
      font-size: 13px;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 6px 12px;
      border-left: 2px solid transparent;
      border-radius: 0 6px 6px 0;
      line-height: 1.4;
    }

    .toc-link:hover {
      color: var(--text-main);
      background: rgba(0, 0, 0, 0.03);
    }

    [data-color-mode="dark"] .toc-link:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .toc-link.active {
      color: var(--accent-color);
      font-weight: 600;
      border-left-color: var(--accent-color);
      background: rgba(9, 105, 218, 0.05);
    }

    [data-color-mode="dark"] .toc-link.active {
      background: rgba(88, 166, 255, 0.05);
    }

    .toc-depth-1 { padding-left: 12px; }
    .toc-depth-2 { padding-left: 24px; }
    .toc-depth-3 { padding-left: 36px; }
    .toc-depth-4 { padding-left: 48px; }

    /* Main Content Area */
    .main-content {
      margin-left: 320px;
      flex-grow: 1;
      padding: 96px 80px 60px 80px;
      background: var(--bg-app);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      transition: margin-left var(--transition-speed), margin-right var(--transition-speed), background-color var(--transition-speed);
    }

    .preview-container {
      position: relative;
      width: 100%;
      max-width: 900px;
      background-color: transparent;
      animation: fadeIn 0.6s ease;
    }

    /* Markdown Body Overrides */
    .markdown-body {
      background-color: transparent !important;
      color: var(--text-main) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji" !important;
    }

    [data-color-mode="dark"] .markdown-body {
      --color-canvas-default: transparent !important;
    }
    
    /* Mermaid diagram container styling */
    .mermaid {
      background-color: white !important;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: var(--shadow-sm);
      overflow-x: auto;
      max-width: 100%;
    }
    [data-color-mode="dark"] .mermaid {
      background-color: #161b22 !important;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }

    .mermaid-error-box {
      background: rgba(207, 34, 46, 0.05);
      border: 1px solid rgba(207, 34, 46, 0.3);
      border-radius: 6px;
      padding: 12px 16px;
      width: 100%;
      text-align: left;
      font-family: var(--font-ui);
    }
    .mermaid-error-title {
      font-weight: 600;
      font-size: 13px;
      color: #cf222e;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .mermaid-error-msg {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .mermaid-raw-code {
      background: rgba(0, 0, 0, 0.04);
      padding: 8px 12px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      overflow-x: auto;
    }
    [data-color-mode="dark"] .mermaid-raw-code {
      background: rgba(255, 255, 255, 0.04);
    }

    /* Image styling & missing image notice */
    .markdown-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      margin: 16px 0;
      display: inline-block;
    }
    .image-missing-notice {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(207, 34, 46, 0.08);
      border: 1px dashed rgba(207, 34, 46, 0.4);
      color: #cf222e;
      font-size: 12px;
      margin: 8px 0;
    }

    /* Top Bar Styling */
    .top-bar {
      position: fixed;
      top: 0;
      left: 320px;
      right: 0;
      height: 56px;
      background: var(--bg-glass);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-color);
      z-index: 99;
      display: flex;
      align-items: center;
      padding: 0 24px;
      transition: left var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1), background-color var(--transition-speed), border-color var(--transition-speed);
    }

    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      overflow: hidden;
    }

    .top-bar-title {
      font-family: var(--font-ui);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }

    .top-bar-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 16px;
    }

    /* Small round buttons for top-bar */
    .btn-control-inline {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      width: 36px;
      height: 36px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 15px;
      position: relative;
    }

    .btn-control-inline:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-main);
      border-color: var(--border-color);
    }
    
    [data-color-mode="dark"] .btn-control-inline:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-control-inline.btn-comments-toggle {
      color: var(--accent-color);
    }
    
    .btn-control-inline.btn-comments-toggle:hover {
      background: rgba(9, 105, 218, 0.1);
      border-color: rgba(9, 105, 218, 0.2);
    }

    .badge-count {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #cf222e;
      color: white;
      font-size: 10px;
      font-weight: bold;
      border-radius: 10px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    /* Collapsed Sidebar State styling */
    body.sidebar-hidden .sidebar {
      transform: translateX(-100%);
    }
    body.sidebar-hidden .main-content {
      margin-left: 0;
    }
    body.sidebar-hidden .top-bar {
      left: 0;
    }

    /* Loader Overlay */
    #loader {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--bg-app);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 0.4s ease, visibility 0.4s ease;
      gap: 16px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid var(--border-color);
      border-top-color: var(--accent-color);
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
    }

    .loading-text {
      font-family: var(--font-ui);
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Mobile Responsive adjustments */
    @media (max-width: 992px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.active {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,0.15);
      }
      .main-content {
        margin-left: 0 !important;
        padding: 80px 24px 40px 24px !important;
      }
      .top-bar {
        left: 0 !important;
      }
    }

    /* Print Styles */
    @media print {
      .sidebar, .top-bar, #loader, #comments-drawer, #floating-comment-trigger {
        display: none !important;
      }
      body {
        background: #fff !important;
      }
      .main-content {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .preview-container {
        max-width: 100% !important;
      }
      .mermaid {
        border: none !important;
        box-shadow: none !important;
        page-break-inside: avoid;
      }
    }

    /* ---------------------------------------------------------
       COMMENT SYSTEM STYLES (PREMIUM UI ENHANCEMENTS)
       --------------------------------------------------------- */
    .commentable-element {
      position: relative;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    
    .commentable-element:hover {
      background-color: rgba(9, 105, 218, 0.03);
      box-shadow: -2px 0 0 rgba(9, 105, 218, 0.1);
    }
    [data-color-mode="dark"] .commentable-element:hover {
      background-color: rgba(88, 166, 255, 0.03);
      box-shadow: -2px 0 0 rgba(88, 166, 255, 0.1);
    }

    .commentable-element.has-comments {
      border-left: 3px solid var(--accent-color) !important;
      padding-left: 10px;
    }

    /* Floating trigger button */
    #floating-comment-trigger {
      position: absolute;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--accent-color);
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, transform 0.2s, background-color 0.2s;
      box-shadow: var(--shadow-md);
    }
    
    #floating-comment-trigger:hover {
      transform: scale(1.15);
      background: var(--accent-hover);
    }
    
    #floating-comment-trigger i {
      font-size: 13px;
    }

    /* Comment Badge in document body */
    .comment-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-color);
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 10px;
      padding: 2px 6px;
      margin-left: 8px;
      cursor: pointer;
      vertical-align: middle;
      transition: transform 0.2s, background-color 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      border: 1px solid var(--bg-app);
    }
    .comment-badge:hover {
      transform: scale(1.1);
      background: var(--accent-hover);
    }
    .comment-badge i {
      margin-right: 3px;
      font-size: 9px;
    }

    /* Comments Drawer Container (Right Sidebar) */
    #comments-drawer {
      width: 380px;
      position: fixed;
      top: 0;
      bottom: 0;
      right: -380px;
      background: var(--bg-sidebar);
      border-left: 1px solid var(--border-color);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 1009;
      transition: right var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-md);
    }

    #comments-drawer.active {
      right: 0;
    }

    body.drawer-open .main-content {
      margin-right: 380px;
    }
    @media (max-width: 1200px) {
      body.drawer-open .main-content {
        margin-right: 0;
      }
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .drawer-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .drawer-close, .btn-drawer-add {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      transition: color 0.2s, transform 0.2s;
    }
    .btn-drawer-add:hover {
      color: var(--accent-color);
      transform: scale(1.1);
    }
    .drawer-close:hover {
      color: var(--text-main);
    }

    .drawer-content {
      flex-grow: 1;
      overflow-y: auto;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .drawer-footer {
      padding: 20px 24px;
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    [data-color-mode="dark"] .drawer-footer {
      background: rgba(255, 255, 255, 0.01);
    }

    /* Bulk actions and checkbox styling */
    .drawer-bulk-actions {
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.015);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
    }
    [data-color-mode="dark"] .drawer-bulk-actions {
      background: rgba(255, 255, 255, 0.015);
    }
    
    .select-all-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: relative;
      cursor: pointer;
      user-select: none;
      font-family: var(--font-ui);
      color: var(--text-muted);
    }
    
    .select-all-wrapper:hover {
      color: var(--text-main);
    }

    .select-all-wrapper input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    
    .select-all-text {
      font-size: 12px;
      font-weight: 500;
    }

    .btn-bulk-action {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      font-family: var(--font-ui);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .btn-bulk-action:hover {
      background: rgba(0,0,0,0.03);
      border-color: var(--accent-color);
      color: var(--accent-color);
    }
    
    [data-color-mode="dark"] .btn-bulk-action:hover {
      background: rgba(255,255,255,0.03);
    }

    .btn-bulk-action.btn-copy-selected {
      background: var(--accent-color);
      border-color: var(--accent-color);
      color: white;
    }

    .btn-bulk-action.btn-copy-selected:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
      color: white;
    }

    .btn-bulk-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: var(--border-color) !important;
      background: transparent !important;
      color: var(--text-muted) !important;
    }

    .comment-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    
    .comment-card-label-general {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .comment-select-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      width: 18px;
      height: 18px;
      min-width: 18px;
      min-height: 18px;
      user-select: none;
    }

    .comment-select-checkbox {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .comment-custom-checkbox {
      position: relative;
      height: 18px;
      width: 18px;
      background-color: transparent;
      border: 2px solid var(--border-color);
      border-radius: 50%; /* sleek circular checkbox */
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .comment-select-wrapper:hover .comment-custom-checkbox,
    .select-all-wrapper:hover .comment-custom-checkbox {
      border-color: var(--accent-color);
      background-color: rgba(9, 105, 218, 0.05);
    }
    
    [data-color-mode="dark"] .comment-select-wrapper:hover .comment-custom-checkbox,
    [data-color-mode="dark"] .select-all-wrapper:hover .comment-custom-checkbox {
      background-color: rgba(88, 166, 255, 0.05);
    }

    .comment-select-checkbox:checked ~ .comment-custom-checkbox,
    .select-all-wrapper input[type="checkbox"]:checked ~ .comment-custom-checkbox {
      background-color: var(--accent-color);
      border-color: var(--accent-color);
      transform: scale(1.05);
    }

    .comment-custom-checkbox:after {
      content: "";
      position: absolute;
      display: none;
    }

    .comment-select-checkbox:checked ~ .comment-custom-checkbox:after,
    .select-all-wrapper input[type="checkbox"]:checked ~ .comment-custom-checkbox:after {
      display: block;
    }

    .comment-select-wrapper .comment-custom-checkbox:after,
    .select-all-wrapper .comment-custom-checkbox:after {
      left: 5px;
      top: 2px;
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    /* Comment Cards inside drawer */
    .comment-section-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comment-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--accent-color);
      letter-spacing: 0.8px;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 6px;
      margin-top: 8px;
    }

    .comment-card {
      background: rgba(0, 0, 0, 0.015);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    [data-color-mode="dark"] .comment-card {
      background: rgba(255, 255, 255, 0.015);
    }
    .comment-card:hover {
      border-color: var(--accent-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    [data-color-mode="dark"] .comment-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .comment-card.is-selected {
      border-color: var(--accent-color);
      background-color: rgba(9, 105, 218, 0.04);
      box-shadow: 0 2px 8px rgba(9, 105, 218, 0.05);
    }
    [data-color-mode="dark"] .comment-card.is-selected {
      background-color: rgba(56, 139, 253, 0.08);
      box-shadow: 0 2px 8px rgba(56, 139, 253, 0.15);
    }

    .comment-card-context {
      font-size: 11px;
      font-family: var(--font-mono);
      background: rgba(0,0,0,0.03);
      padding: 6px 10px;
      border-radius: 6px;
      border-left: 2px solid var(--text-muted);
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [data-color-mode="dark"] .comment-card-context {
      background: rgba(255,255,255,0.03);
    }

    .comment-card-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-main);
      white-space: pre-wrap;
    }

    .comment-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    .comment-card-actions {
      display: flex;
      gap: 6px;
    }

    .comment-card-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      width: 26px;
      height: 26px;
      min-width: 26px;
      min-height: 26px;
      padding: 0;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .comment-card-btn:hover {
      color: var(--accent-color);
      border-color: var(--accent-color);
      background-color: rgba(9, 105, 218, 0.05);
    }
    [data-color-mode="dark"] .comment-card-btn:hover {
      background-color: rgba(88, 166, 255, 0.05);
    }
    .comment-card-btn.btn-delete:hover {
      color: #cf222e;
      border-color: #cf222e;
      background-color: rgba(207, 34, 46, 0.05);
    }

    /* Comment input container inside drawer */
    .drawer-input-container {
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-sidebar);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .drawer-input-context {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      gap: 10px;
    }
    [data-color-mode="dark"] .drawer-input-context {
      background: rgba(255, 255, 255, 0.03);
    }
    .context-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
      flex-grow: 1;
    }
    .context-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--accent-color);
      letter-spacing: 0.5px;
    }
    .context-preview {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.4;
      color: var(--text-muted);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 60px;
      overflow-y: auto;
      margin-top: 2px;
    }
    .btn-clear-context {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }
    .btn-clear-context:hover {
      color: #cf222e;
    }
    .drawer-input-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    #drawer-comment-input {
      flex-grow: 1;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 10px 14px;
      font-family: var(--font-ui);
      font-size: 14px;
      background: var(--bg-app);
      color: var(--text-main);
      resize: none;
      min-height: 38px;
      max-height: 120px;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    #drawer-comment-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
    }
    #btn-drawer-comment-send {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 50%;
      background: var(--accent-color);
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: background-color 0.2s, transform 0.1s;
    }
    #btn-drawer-comment-send:hover {
      background-color: var(--accent-hover);
    }
    #btn-drawer-comment-send:active {
      transform: scale(0.95);
    }
    @keyframes card-pulse {
      0% {
        background-color: var(--bg-sidebar);
        box-shadow: var(--shadow-sm);
      }
      30% {
        background-color: rgba(9, 105, 218, 0.15);
        box-shadow: 0 0 0 4px rgba(9, 105, 218, 0.1);
      }
      100% {
        background-color: var(--bg-sidebar);
        box-shadow: var(--shadow-sm);
      }
    }
    .card-highlight {
      animation: card-pulse 1.8s ease-out;
      border-color: var(--accent-color) !important;
    }

    /* Floating control badge */
    .btn-comments-toggle {
      position: relative;
    }
    
    .badge-count {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #cf222e;
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid var(--bg-app);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    /* Empty state */
    .empty-comments {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      gap: 16px;
    }
    .empty-comments-icon {
      font-size: 40px;
      color: var(--border-color);
    }
    .empty-comments-text {
      font-size: 13px;
      line-height: 1.5;
    }

    /* Action button states */
    .btn-export {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 600;
      font-family: var(--font-ui);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      width: 100%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn-export:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .btn-export:active {
      transform: translateY(0);
    }

    .btn-secondary-action {
      background: transparent;
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 8px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      flex: 1;
    }
    .btn-secondary-action:hover {
      background: rgba(0,0,0,0.03);
    }
    [data-color-mode="dark"] .btn-secondary-action:hover {
      background: rgba(255,255,255,0.03);
    }

    .secondary-actions-row {
      display: flex;
      gap: 10px;
      width: 100%;
    }

    /* Pulse visual feedback when locating commented elements */
    @keyframes element-pulse {
      0% {
        background-color: transparent;
        box-shadow: none;
      }
      30% {
        background-color: rgba(9, 105, 218, 0.25);
        box-shadow: 0 0 0 8px rgba(9, 105, 218, 0.15);
      }
      100% {
        background-color: transparent;
        box-shadow: none;
      }
    }
    .pulse-highlight {
      animation: element-pulse 1.8s ease-out;
      border-radius: 4px;
    }

    /* Toast Notification */
    #comments-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      opacity: 0;
      background: #2da44e;
      color: white;
      padding: 12px 24px;
      border-radius: 30px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
      font-family: var(--font-ui);
      font-size: 14px;
    }
    #comments-toast.active {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>

  <!-- Loading Screen -->
  <div id="loader">
    <div class="spinner"></div>
    <div class="loading-text">Parsing markdown and preparing workspace...</div>
  </div>



  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <i class="fa-solid fa-square-check sidebar-icon"></i>
      <span class="sidebar-title" title="${fileName}">${fileName}</span>
    </div>

    <!-- Search -->
    <div class="search-box">
      <i class="fas fa-search search-icon"></i>
      <input type="text" class="search-input" placeholder="Search document..." aria-label="Search preview">
    </div>

    <!-- Statistics -->
    <div class="stats-card">
      <div class="stats-title">Document Stats</div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-val" id="stat-words">0</span>
          <span class="stat-lbl">words</span>
        </div>
        <div class="stat-item">
          <span class="stat-val" id="stat-time">0</span>
          <span class="stat-lbl">min read</span>
        </div>
        <div class="stat-item">
          <span class="stat-val" id="stat-mermaid">0</span>
          <span class="stat-lbl">diagrams</span>
        </div>
        <div class="stat-item">
          <span class="stat-val" id="stat-size">${fileSizeKB}</span>
          <span class="stat-lbl">KB size</span>
        </div>
      </div>
      <div class="file-details">
        <div><strong>Path:</strong> ${absoluteMdPath}</div>
        <div><strong>Modified:</strong> ${lastModified}</div>
      </div>
    </div>

    <!-- Table of Contents -->
    <div class="toc-container">
      <div class="toc-title">Table of Contents</div>
      <div class="toc-wrapper">
        <nav class="toc-list" id="toc-list"></nav>
      </div>
    </div>
  </div>

  <!-- Main View -->
  <div class="main-content">
    <div class="preview-container">
      <article id="preview" class="markdown-body"></article>
      
      <!-- Floating Comment Trigger Button -->
      <button id="floating-comment-trigger" title="Add Review Comment">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  </div>

  <!-- Top Bar -->
  <div class="top-bar">
    <div class="top-bar-left">
      <button class="btn-control-inline btn-sidebar-toggle" onclick="toggleSidebar()" title="Toggle Sidebar" aria-label="Toggle Sidebar">
        <i class="fa-solid fa-angles-left"></i>
      </button>
      <span class="top-bar-title" title="${fileName}">${fileName}</span>
      <div class="top-bar-controls">
        <button class="btn-control-inline btn-theme" title="Toggle Theme" aria-label="Toggle Theme">
          <i class="fas fa-moon"></i>
        </button>
        <button class="btn-control-inline btn-copy" onclick="copyHTML()" title="Copy HTML Content" aria-label="Copy HTML Content">
          <i class="fas fa-copy"></i>
        </button>
        <button class="btn-control-inline btn-print" onclick="window.print()" title="Print / Export to PDF" aria-label="Print / Export to PDF">
          <i class="fas fa-print"></i>
        </button>
        <button class="btn-control-inline btn-comments-toggle" onclick="toggleCommentsDrawer()" title="Toggle Comments Drawer" aria-label="Toggle Comments Drawer">
          <i class="fas fa-comments"></i>
          <span class="badge-count" id="global-comments-count" style="display: none;">0</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Floating Comment Trigger Button moved inside preview-container -->

  <!-- Comments Drawer (Right Sidebar) -->
  <div id="comments-drawer">
    <div class="drawer-header">
      <div class="drawer-title">
        <i class="fas fa-comments" style="color: var(--accent-color);"></i>
        Review Comments
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="btn-drawer-add" onclick="openGenericCommentModal()" title="Add General Comment" aria-label="Add General Comment">
          <i class="fas fa-plus"></i>
        </button>
        <button class="drawer-close" onclick="toggleCommentsDrawer(false)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <!-- Bulk Action Bar -->
    <div class="drawer-bulk-actions" id="bulk-actions-container" style="display: none;">
      <label class="select-all-wrapper">
        <input type="checkbox" id="checkbox-select-all" onchange="toggleSelectAll(this)">
        <span class="comment-custom-checkbox"></span>
        <span class="select-all-text">Select All</span>
      </label>
      <div style="display: flex; gap: 8px;">
        <button class="btn-bulk-action btn-copy-selected" onclick="copySelectedComments()" title="Copy Selected to Clipboard">
          <i class="fas fa-copy"></i> <span id="copy-selected-text">Copy Selected</span>
        </button>
      </div>
    </div>

    <div class="drawer-content" id="drawer-comments-list">
      <!-- Generated list of comments -->
    </div>
    
    <!-- Comment Input Area (Chat Style) -->
    <div class="drawer-input-container">
      <div id="drawer-input-context" class="drawer-input-context" style="display: none;">
        <div class="context-info">
          <span class="context-label">Commenting on</span>
          <span id="drawer-context-preview" class="context-preview"></span>
        </div>
        <button class="btn-clear-context" onclick="clearActiveContext()" title="Clear Context (make general)" aria-label="Clear Context">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="drawer-input-row">
        <textarea id="drawer-comment-input" placeholder="Type a comment..." rows="1" oninput="autoGrowTextarea(this)" onkeydown="handleInputKeydown(event)"></textarea>
        <button id="btn-drawer-comment-send" onclick="saveNewComment()" title="Add Comment" aria-label="Add Comment">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="drawer-footer" id="export-actions-container" style="display: none;">
      <button class="btn-export" onclick="copyCommentsForClaude()">
        <i class="fas fa-copy"></i> Copy All for Claude
      </button>
      <div class="secondary-actions-row">
        <button class="btn-secondary-action" onclick="downloadCommentsAsFile()">
          <i class="fas fa-download"></i> Save Report
        </button>
        <button class="btn-secondary-action btn-delete" onclick="clearAllComments()">
          <i class="fas fa-trash"></i> Clear All
        </button>
      </div>
    </div>
  </div>

  <!-- Embedded Markdown Source -->
  <script id="markdown-source" type="text/plain">${encodedMarkdown}</script>

  <!-- Script for Markdown rendering, Theme toggling, TOC, and Search -->
  <script>
    const fileName = ${JSON.stringify(fileName)};
    const baseDir = ${JSON.stringify(mdDirectory)};

    // Early initialize Mermaid with loose security to prevent sandbox iframes on file:// URLs
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      });
    }

    // 1. Decode raw Markdown
    const encodedSource = document.getElementById('markdown-source').textContent;
    const markdownText = decodeURIComponent(encodedSource);

    // Helper to resolve relative filesystem paths against baseDir
    function resolveRelativePath(base, relative) {
      const stack = base.split('/').filter(Boolean);
      const parts = relative.split('/');
      for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
          if (stack.length > 0) stack.pop();
        } else {
          stack.push(part);
        }
      }
      return '/' + stack.join('/');
    }

    function isExternalOrAbsoluteUrl(url) {
      if (!url) return false;
      return url.includes('://') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('//');
    }

    // Restore sidebar state early to avoid layout flash
    const sidebarHidden = localStorage.getItem('md_review_sidebar_hidden') === 'true';
    if (sidebarHidden && window.innerWidth > 992) {
      document.body.classList.add('sidebar-hidden');
    }

    // 2. Setup Marked with Custom Code & Image Renderer (supporting both old & new Marked APIs)
    const renderer = new marked.Renderer();
    renderer.code = function(first, second, third) {
      let text = '';
      let lang = '';
      if (typeof first === 'object' && first !== null) {
        text = first.text;
        lang = first.lang;
      } else {
        text = first;
        lang = second;
      }
      
      const cleanLang = (lang || '').trim().toLowerCase();
      if (cleanLang === 'mermaid') {
        return \`<pre class="mermaid">\${escapeHtml(text)}</pre>\`;
      }
      
      return \`<pre><code class="hljs language-\${cleanLang || 'text'}">\${escapeHtml(text)}</code></pre>\`;
    };

    renderer.image = function(first, second, third) {
      let href = '';
      let title = '';
      let text = '';
      if (typeof first === 'object' && first !== null) {
        href = first.href;
        title = first.title;
        text = first.text;
      } else {
        href = first;
        title = second;
        text = third;
      }

      let finalSrc = href || '';
      if (finalSrc && !isExternalOrAbsoluteUrl(finalSrc)) {
        const resolved = finalSrc.startsWith('/') ? finalSrc : resolveRelativePath(baseDir, finalSrc);
        finalSrc = 'file://' + encodeURI(resolved);
      }

      const titleAttr = title ? ' title="' + escapeHtml(title) + '"' : '';
      return '<img src="' + finalSrc + '" alt="' + escapeHtml(text || '') + '"' + titleAttr + '>';
    };

    function escapeHtml(unsafe) {
      return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    marked.use({ renderer, gfm: true, breaks: false });

    // 3. Document statistics calculation
    function calculateStats(text) {
      const words = text.trim().split(/\\s+/).filter(Boolean).length;
      const readTime = Math.ceil(words / 200) || 1;
      const mermaidCharts = (text.match(/\\\`\\\`\\\`mermaid/g) || []).length;

      document.getElementById('stat-words').textContent = words.toLocaleString();
      document.getElementById('stat-time').textContent = readTime;
      document.getElementById('stat-mermaid').textContent = mermaidCharts;
    }

    // 4. Slugify headings to generate IDs
    function slugify(text) {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\\s+/g, '-')
        .replace(/[^\\w\\-]+/g, '')
        .replace(/\\-\\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }

    // 5. Generate Table of Contents
    function generateTOC(previewEl) {
      const headings = previewEl.querySelectorAll('h1, h2, h3, h4');
      const tocList = document.getElementById('toc-list');
      tocList.innerHTML = '';

      if (headings.length === 0) {
        document.querySelector('.toc-container').style.display = 'none';
        return;
      }

      headings.forEach(heading => {
        // Add ID if not present
        if (!heading.getAttribute('id')) {
          const slug = slugify(heading.textContent);
          let uniqueSlug = slug;
          let count = 1;
          while (document.getElementById(uniqueSlug)) {
            uniqueSlug = \`\${slug}-\\$\${count}\`;
            count++;
          }
          heading.setAttribute('id', uniqueSlug);
        }

        const id = heading.getAttribute('id');
        const level = parseInt(heading.tagName.replace('H', ''), 10);
        
        const li = document.createElement('li');
        li.className = 'toc-item';
        
        const a = document.createElement('a');
        a.href = \`#\${id}\`;
        a.className = \`toc-link toc-depth-\${level}\`;
        a.textContent = heading.textContent;
        a.title = heading.textContent;
        
        li.appendChild(a);
        tocList.appendChild(li);
      });

      // Setup ScrollSpy
      setupScrollSpy(headings);
    }

    // 6. Scroll Spy implementation
    function setupScrollSpy(headings) {
      const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60% 0px',
        threshold: 0
      };

      const headingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            if (!id) return;

            document.querySelectorAll('.toc-link').forEach(link => {
              link.classList.remove('active');
            });

            const activeLink = document.querySelector(\`.toc-link[href="#\${id}"]\`);
            if (activeLink) {
              activeLink.classList.add('active');
              activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        });
      }, observerOptions);

      headings.forEach(heading => {
        headingObserver.observe(heading);
      });
    }

    // 7. Search & Highlight Functionality
    let originalHTML = '';
    const searchInput = document.querySelector('.search-input');
    
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });

    function performSearch(query) {
      const previewEl = document.getElementById('preview');
      if (!originalHTML) {
        originalHTML = previewEl.innerHTML;
      }

      if (!query.trim()) {
        previewEl.innerHTML = originalHTML;
        // Re-generate keys and comment indicators
        generateElementKeys(previewEl);
        // Re-observe headings since we reset innerHTML
        const headings = previewEl.querySelectorAll('h1, h2, h3, h4');
        setupScrollSpy(headings);
        return;
      }

      previewEl.innerHTML = originalHTML;
      
      const walker = document.createTreeWalker(previewEl, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const parentTagName = node.parentNode.tagName.toUpperCase();
        if (['PRE', 'CODE', 'STYLE', 'SCRIPT'].includes(parentTagName)) {
          continue;
        }
        if (node.parentNode.closest('.mermaid') || node.parentNode.closest('svg')) {
          continue;
        }
        textNodes.push(node);
      }

      const escapedQuery = query.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
      const regex = new RegExp(\`(\${escapedQuery})\`, 'gi');

      textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        const text = textNode.nodeValue;
        if (regex.test(text)) {
          const fragment = document.createDocumentFragment();
          const parts = text.split(regex);
          parts.forEach(part => {
            if (regex.test(part)) {
              const mark = document.createElement('mark');
              mark.textContent = part;
              mark.style.backgroundColor = '#ffeb3b';
              mark.style.color = '#000';
              mark.style.borderRadius = '3px';
              mark.style.padding = '1px 3px';
              fragment.appendChild(mark);
            } else {
              fragment.appendChild(document.createTextNode(part));
            }
          });
          parent.replaceChild(fragment, textNode);
        }
      });
      
      // Re-observe headings
      const headings = previewEl.querySelectorAll('h1, h2, h3, h4');
      setupScrollSpy(headings);
    }

    // 8. Theme toggling
    const btnTheme = document.querySelector('.btn-theme');
    
    function setTheme(theme) {
      document.documentElement.setAttribute('data-color-mode', theme);
      localStorage.setItem('md-preview-theme', theme);
      
      const icon = btnTheme.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }

      const hljsLight = document.getElementById('hljs-light');
      const hljsDark = document.getElementById('hljs-dark');
      if (theme === 'dark') {
        hljsDark.removeAttribute('disabled');
        hljsLight.setAttribute('disabled', 'true');
      } else {
        hljsLight.removeAttribute('disabled');
        hljsDark.setAttribute('disabled', 'true');
      }

      // Re-render Mermaid diagrams on theme change
      if (typeof renderMermaidDiagrams === 'function') {
        renderMermaidDiagrams();
      }
    }

    const savedTheme = localStorage.getItem('md-preview-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    btnTheme.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-color-mode');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // ---------------------------------------------------------
    // COMMENT SYSTEM CORE CLIENT-SIDE LOGIC
    // ---------------------------------------------------------
    
    // Stable file-based storage key
    const storageKey = 'md_review_' + encodeURIComponent('${absoluteMdPath.replace(/\\/g, '\\\\')}');
    let comments = {};
    let activeHoveredElement = null;
    let currentKey = null;
    let editingCommentIndex = null;
    let activeSelectionText = null;
    let selectedCommentsState = {};

    // Load comments
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        comments = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load comments from local storage", e);
    }

    function simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    }

    function getNearestHeadingText(el) {
      let sibling = el.previousElementSibling;
      while (sibling) {
        if (/^H[1-6]$/.test(sibling.tagName)) {
          return sibling.textContent.trim();
        }
        sibling = sibling.previousElementSibling;
      }
      return 'Introduction';
    }

    function addCommentBadge(el, key) {
      const existingBadge = el.querySelector(\`.comment-badge[data-key="\${key}"]\`);
      if (existingBadge) {
        existingBadge.innerHTML = \`<i class="fas fa-comment"></i> \${comments[key].length}\`;
        return;
      }
      
      const badge = document.createElement('span');
      badge.className = 'comment-badge';
      badge.setAttribute('data-key', key);
      badge.innerHTML = \`<i class="fas fa-comment"></i> \${comments[key].length}\`;
      badge.title = \`\${comments[key].length} comment(s) on this element. Click to manage.\`;
      
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        openCommentModal(key);
      });
      
      if (el.tagName === 'PRE') {
        badge.style.position = 'absolute';
        badge.style.top = '10px';
        badge.style.right = '40px';
        el.style.position = 'relative';
        el.appendChild(badge);
      } else if (el.tagName === 'TR') {
        const lastCell = el.lastElementChild;
        if (lastCell) {
          lastCell.appendChild(badge);
        }
      } else {
        el.appendChild(badge);
      }
    }

    function generateElementKeys(container) {
      const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, tr');
      const counts = {};
      
      // Clean up any stale badges first
      document.querySelectorAll('.comment-badge').forEach(b => b.remove());
      
      elements.forEach((el) => {
        const text = el.getAttribute('data-original-code') || el.innerText || el.textContent || '';
        const cleanText = text.trim().substring(0, 150).replace(/\\s+/g, ' ');
        const hash = simpleHash(cleanText || 'empty');
        const tagName = el.tagName.toLowerCase();
        
        let key = \`\${tagName}-\${hash}\`;
        if (counts[key] === undefined) {
          counts[key] = 0;
        } else {
          counts[key]++;
          key = \`\${key}-\${counts[key]}\`;
        }
        
        el.setAttribute('data-comment-key', key);
        el.setAttribute('data-comment-context', cleanText);
        el.classList.add('commentable-element');
        
        if (comments[key] && comments[key].length > 0) {
          el.classList.add('has-comments');
          addCommentBadge(el, key);
        } else {
        el.classList.remove('has-comments');
        }
      });
    }

    // Selection modal trigger
    function openCommentModalWithSelection(selectedText) {
      if (!activeHoveredElement) return;
      const key = activeHoveredElement.getAttribute('data-comment-key');
      if (!key) return;
      
      currentKey = key;
      editingCommentIndex = null;
      activeSelectionText = selectedText;

      // Ensure comments drawer is open
      toggleCommentsDrawer(true);

      const contextEl = document.getElementById('drawer-input-context');
      const previewEl = document.getElementById('drawer-context-preview');
      const sendBtn = document.getElementById('btn-drawer-comment-send');
      const inputEl = document.getElementById('drawer-comment-input');

      // Reset send button to + (add mode)
      sendBtn.innerHTML = '<i class="fas fa-plus"></i>';
      sendBtn.title = 'Add Comment';

      if (selectedText && selectedText.trim()) {
        previewEl.textContent = selectedText.trim();
        contextEl.style.display = 'flex';
      } else {
        contextEl.style.display = 'none';
      }

      inputEl.value = '';
      inputEl.style.height = ''; // Reset auto-grow height
      inputEl.focus();
    }

    // Setup interactive hover trigger positioning
    function setupCommentInteractions() {
      const trigger = document.getElementById('floating-comment-trigger');
      const previewEl = document.getElementById('preview');

      previewEl.addEventListener('mousemove', (e) => {
        // If there's an active text selection, keep the selection trigger active
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) return;

        const commentable = e.target.closest('.commentable-element');
        if (commentable) {
          activeHoveredElement = commentable;
          const rect = commentable.getBoundingClientRect();
          const container = document.querySelector('.preview-container');
          const containerRect = container.getBoundingClientRect();
          
          // Position relative to .preview-container
          let leftPos = rect.left - containerRect.left - 36;
          if (leftPos < 0) {
            leftPos = rect.right - containerRect.left + 8;
          }
          
          const topPos = rect.top - containerRect.top + (rect.height - 30) / 2;
          
          trigger.style.left = leftPos + 'px';
          trigger.style.top = topPos + 'px';
          trigger.style.opacity = '1';
          trigger.style.visibility = 'visible';
          trigger.removeAttribute('data-mode');
        } else {
          if (!e.target.closest('#floating-comment-trigger')) {
            trigger.style.opacity = '0';
            trigger.style.visibility = 'hidden';
          }
        }
      });
      
      previewEl.addEventListener('mouseleave', () => {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.toString().trim().length > 0) return;

          if (!document.activeElement || !document.activeElement.closest('#floating-comment-trigger')) {
            trigger.style.opacity = '0';
            trigger.style.visibility = 'hidden';
          }
        }, 200);
      });

      // Text Selection Listener
      document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectionText = selection.toString().trim();
        
        if (selectionText.length > 0) {
          const previewEl = document.getElementById('preview');
          if (previewEl.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const container = document.querySelector('.preview-container');
            const containerRect = container.getBoundingClientRect();
            
            // Position above highlighted text selection center
            const leftPos = rect.left - containerRect.left + (rect.width - 30) / 2;
            const topPos = rect.top - containerRect.top - 36;
            
            trigger.style.left = leftPos + 'px';
            trigger.style.top = topPos + 'px';
            trigger.style.opacity = '1';
            trigger.style.visibility = 'visible';
            trigger.setAttribute('data-mode', 'selection');
            
            // Link to parent block element
            const parent = selection.anchorNode.parentElement;
            activeHoveredElement = parent.closest('.commentable-element');
          }
        }
      });

      trigger.addEventListener('mousedown', (e) => {
        // Prevent selection from being cleared when clicking the trigger button
        e.preventDefault();
      });

      trigger.addEventListener('click', () => {
        if (trigger.getAttribute('data-mode') === 'selection') {
          const selection = window.getSelection();
          const selectionText = selection.toString().trim();
          if (selectionText) {
            openCommentModalWithSelection(selectionText);
          }
        } else if (activeHoveredElement) {
          const key = activeHoveredElement.getAttribute('data-comment-key');
          if (key) {
            openCommentModal(key);
          }
        }
      });
    }

    // Helper functions for chat messenger comment style
    function autoGrowTextarea(element) {
      element.style.height = "5px";
      element.style.height = (element.scrollHeight) + "px";
    }

    function handleInputKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveNewComment();
      }
    }

    function highlightCommentsInDrawer(key) {
      const cards = document.querySelectorAll(\`#drawer-comments-list .comment-card[data-key="\${key}"]\`);
      if (cards.length > 0) {
        cards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        cards.forEach(card => {
          card.classList.remove('card-highlight');
          void card.offsetWidth;
          card.classList.add('card-highlight');
          setTimeout(() => {
            card.classList.remove('card-highlight');
          }, 2000);
        });
      }
    }

    function clearActiveContext() {
      currentKey = 'generic-' + Math.random().toString(36).substring(2, 11);
      activeSelectionText = null;
      editingCommentIndex = null;
      
      const contextEl = document.getElementById('drawer-input-context');
      if (contextEl) contextEl.style.display = 'none';
      
      const sendBtn = document.getElementById('btn-drawer-comment-send');
      if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-plus"></i>';
        sendBtn.title = 'Add Comment';
      }
      
      const inputEl = document.getElementById('drawer-comment-input');
      if (inputEl) {
        inputEl.value = '';
        inputEl.style.height = ''; // Reset height
        inputEl.focus();
      }
    }

    // Modal state controls (Redirected to Comments Drawer)
    function openCommentModal(key) {
      currentKey = key;
      editingCommentIndex = null;

      // Ensure comments drawer is open
      toggleCommentsDrawer(true);

      const el = document.querySelector('[data-comment-key="' + key + '"]');
      const contextText = el ? (el.getAttribute('data-comment-context') || el.innerText || el.textContent) : '';
      
      const contextEl = document.getElementById('drawer-input-context');
      const previewEl = document.getElementById('drawer-context-preview');
      const sendBtn = document.getElementById('btn-drawer-comment-send');
      const inputEl = document.getElementById('drawer-comment-input');

      // Reset send button to + (add mode)
      sendBtn.innerHTML = '<i class="fas fa-plus"></i>';
      sendBtn.title = 'Add Comment';

      if (contextText && contextText.trim()) {
        previewEl.textContent = contextText.trim();
        contextEl.style.display = 'flex';
      } else {
        contextEl.style.display = 'none';
      }

      inputEl.value = '';
      inputEl.style.height = ''; // Reset auto-grow height
      inputEl.focus();

      // Highlight in drawer if comments exist
      if (comments[key] && comments[key].length > 0) {
        highlightCommentsInDrawer(key);
      }
    }

    function closeCommentModal() {
      // Stub kept for compatibility, modal removed
      currentKey = null;
      editingCommentIndex = null;
      activeSelectionText = null;
    }

    function saveNewComment() {
      const inputEl = document.getElementById('drawer-comment-input');
      const text = inputEl.value.trim();
      if (!text) return;
      
      if (!currentKey) {
        currentKey = 'generic-' + Math.random().toString(36).substring(2, 11);
      }
      
      if (!comments[currentKey]) {
        comments[currentKey] = [];
      }
      
      const el = document.querySelector('[data-comment-key="' + currentKey + '"]');
      const heading = el ? getNearestHeadingText(el) : 'General';
      
      let context = '';
      if (activeSelectionText) {
        context = activeSelectionText;
      } else if (el) {
        context = el.getAttribute('data-comment-context') || el.innerText || el.textContent || '';
      }
      
      if (editingCommentIndex !== null) {
        comments[currentKey][editingCommentIndex].text = text;
        comments[currentKey][editingCommentIndex].timestamp = Date.now();
        editingCommentIndex = null;
      } else {
        comments[currentKey].push({
          text: text,
          timestamp: Date.now(),
          heading: heading,
          context: context.trim()
        });
      }
      
      activeSelectionText = null;
      
      saveComments();
      
      if (el && !currentKey.startsWith('generic-')) {
        el.classList.add('has-comments');
        addCommentBadge(el, currentKey);
      }
      
      // Clear drawer input field and context preview
      inputEl.value = '';
      inputEl.style.height = ''; // Reset height
      
      const contextEl = document.getElementById('drawer-input-context');
      if (contextEl) contextEl.style.display = 'none';
      
      // Reset send button icon
      const sendBtn = document.getElementById('btn-drawer-comment-send');
      if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-plus"></i>';
        sendBtn.title = 'Add Comment';
      }
      
      // Generate generic-xxx for the next comment context (unless they hover or select again)
      currentKey = 'generic-' + Math.random().toString(36).substring(2, 11);
      
      renderCommentsDrawer();

      // Auto-copy comments on save if drawer is active
      if (document.getElementById('comments-drawer').classList.contains('active')) {
        copyCommentsForClaudeSilently();
      }
    }

    function saveComments() {
      localStorage.setItem(storageKey, JSON.stringify(comments));
      updateGlobalCommentCounter();
    }

    function updateGlobalCommentCounter() {
      let count = 0;
      Object.keys(comments).forEach(k => {
        count += comments[k].length;
      });
      
      const badge = document.getElementById('global-comments-count');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // Drawer state controls
    function toggleCommentsDrawer(forceState) {
      const drawer = document.getElementById('comments-drawer');
      const body = document.body;
      const isOpen = drawer.classList.contains('active');
      
      const newState = typeof forceState === 'boolean' ? forceState : !isOpen;
      
      if (newState) {
        drawer.classList.add('active');
        body.classList.add('drawer-open');
        renderCommentsDrawer();
        
        // Auto-copy to clipboard if comments exist
        const hasComments = Object.keys(comments).some(k => comments[k] && comments[k].length > 0);
        if (hasComments) {
          copyCommentsForClaudeSilently();
        }
      } else {
        drawer.classList.remove('active');
        body.classList.remove('drawer-open');
      }
    }

    function renderCommentsDrawer() {
      const container = document.getElementById('drawer-comments-list');
      container.innerHTML = '';
      
      let totalCount = 0;
      const groups = {};
      
      Object.keys(comments).forEach(key => {
        comments[key].forEach((c, idx) => {
          totalCount++;
          const section = c.heading || 'General';
          if (!groups[section]) {
            groups[section] = [];
          }
          groups[section].push({
            key: key,
            index: idx,
            comment: c
          });
        });
      });
      
      if (totalCount === 0) {
        container.innerHTML = \`
          <div class="empty-comments">
            <i class="fas fa-comments empty-comments-icon"></i>
            <div class="empty-comments-text">
              <strong>No comments yet</strong><br>
              Hover over text blocks and click the blue <strong>+</strong> button to add review comments, or click the <strong>+</strong> button in the drawer header for general feedback.
            </div>
          </div>
        \`;
        document.getElementById('export-actions-container').style.display = 'none';
        document.getElementById('bulk-actions-container').style.display = 'none';
        return;
      }
      
      document.getElementById('export-actions-container').style.display = 'block';
      document.getElementById('bulk-actions-container').style.display = 'flex';
      
      Object.keys(groups).forEach(section => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'comment-section-group';
        
        const title = document.createElement('div');
        title.className = 'comment-section-title';
        title.textContent = section;
        groupDiv.appendChild(title);
        
        groups[section].forEach(item => {
          const card = document.createElement('div');
          card.className = 'comment-card';
          card.setAttribute('data-key', item.key);
          card.setAttribute('data-index', item.index);
          
          if (selectedCommentsState[item.key] === undefined) {
            selectedCommentsState[item.key] = {};
          }
          if (selectedCommentsState[item.key][item.index] === undefined) {
            selectedCommentsState[item.key][item.index] = true;
          }
          const isSelected = selectedCommentsState[item.key][item.index];
          if (isSelected) {
            card.classList.add('is-selected');
          }
          
          const isGeneric = item.key.startsWith('generic-');
          const contextHtml = isGeneric ? '<span class="comment-card-label-general">General Suggestion</span>' : \`
            <div class="comment-card-context" title="\${escapeHtml(item.comment.context)}">
              Context: \${escapeHtml(item.comment.context)}
            </div>
          \`;
          const locateHtml = isGeneric ? '' : \`
            <button class="comment-card-btn" title="Locate in Document" onclick="locateElement('\${item.key}')">
              <i class="fas fa-crosshairs"></i>
            </button>
          \`;
          
          card.innerHTML = \`
            <div class="comment-card-header">
              \${contextHtml}
            </div>
            <div class="comment-card-text">\${escapeHtml(item.comment.text).replace(/\\n/g, '<br>')}</div>
            <div class="comment-card-meta">
              <span>\${new Date(item.comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <div class="comment-card-actions">
                \${locateHtml}
                <button class="comment-card-btn btn-copy-card" title="Copy Comment" onclick="copySingleComment('\${item.key}', \${item.index})">
                  <i class="fas fa-copy"></i>
                </button>
                <button class="comment-card-btn" title="Edit Comment" onclick="editCommentFromDrawer('\${item.key}', \${item.index})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="comment-card-btn btn-delete" title="Delete Comment" onclick="deleteCommentFromDrawer('\${item.key}', \${item.index})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          \`;
          
          card.addEventListener('click', (e) => {
            if (e.target.closest('.comment-card-btn')) {
              return;
            }
            const selected = !card.classList.contains('is-selected');
            if (selected) {
              card.classList.add('is-selected');
            } else {
              card.classList.remove('is-selected');
            }
            if (selectedCommentsState[item.key] === undefined) {
              selectedCommentsState[item.key] = {};
            }
            selectedCommentsState[item.key][item.index] = selected;
            updateSelectedCommentsCount();
          });
          
          groupDiv.appendChild(card);
        });
        
        container.appendChild(groupDiv);
      });
      
      updateSelectedCommentsCount();
    }

    // Export report generation
    function generateMarkdownReport() {
      let report = \`# Review Feedback for \${fileName}\\n\\n\`;
      report += \`Here is the consolidated feedback and action items from the review:\\n\\n\`;
      
      const groups = {};
      Object.keys(comments).forEach(key => {
        comments[key].forEach(c => {
          const section = c.heading || 'General';
          if (!groups[section]) {
            groups[section] = [];
          }
          groups[section].push({
            key: key,
            comment: c
          });
        });
      });
      
      Object.keys(groups).forEach(section => {
        report += \`## 📌 Section: "\${section}"\\n\\n\`;
        groups[section].forEach(item => {
          const c = item.comment;
          const isCode = item.key.startsWith('pre-');
          const isGeneric = item.key.startsWith('generic-');
          
          if (!isGeneric && c.context) {
            if (isCode) {
              report += \`> **Context (Code Block):**\\n\`;
              report += '> \\\\x60\\\\x60\\\\x60\\\\n';
              c.context.split('\\n').forEach(line => {
                report += \`> \${line}\\n\`;
              });
              report += '> \\\\x60\\\\x60\\\\x60\\\\n\\\\n';
            } else {
              report += \`> **Context:**\\n\`;
              c.context.split('\\n').forEach(line => {
                report += \`> \${line}\\n\`;
              });
              report += \`\\n\`;
            }
          }
          report += \`**Suggestion:** \${c.text}\\n\\n\`;
          report += \`---\\n\\n\`;
        });
      });
      
      let totalCount = 0;
      Object.keys(comments).forEach(k => {
        totalCount += comments[k].length;
      });
      report += \`Generated with Review Tool. Total action items: \${totalCount}\`;
      return report;
    }

    // Expose all handlers to global scope for HTML onclick bindings
    window.toggleCommentsDrawer = toggleCommentsDrawer;
    window.saveNewComment = saveNewComment;
    window.closeCommentModal = closeCommentModal;
    window.autoGrowTextarea = autoGrowTextarea;
    window.handleInputKeydown = handleInputKeydown;
    window.clearActiveContext = clearActiveContext;
    
    window.openGenericCommentModal = function() {
      const key = 'generic-' + Math.random().toString(36).substring(2, 11);
      openCommentModal(key);
    };

    window.copySingleComment = function(key, index) {
      const c = comments[key][index];
      let report = '';
      const section = c.heading || 'General';
      report += \`## 📌 Section: "\${section}"\\n\\n\`;
      const isCode = key.startsWith('pre-');
      const isGeneric = key.startsWith('generic-');
      
      if (!isGeneric && c.context) {
        if (isCode) {
          report += \`> **Context (Code Block):**\\n\`;
          report += '> \\\\x60\\\\x60\\\\x60\\\\n';
          c.context.split('\\n').forEach(line => {
            report += \`> \${line}\\n\`;
          });
          report += '> \\\\x60\\\\x60\\\\x60\\\\n\\\\n';
        } else {
          report += \`> **Context:**\\n\`;
          c.context.split('\\n').forEach(line => {
            report += \`> \${line}\\n\`;
          });
          report += \`\\n\`;
        }
      }
      report += \`**Suggestion:** \${c.text}\\n\`;
      
      copyToClipboard(report).then(() => {
        showToast("Comment copied!");
      }).catch(err => {
        console.error("Failed to copy comment: ", err);
      });
    };

    window.updateSelectedCommentsCount = function() {
      const cards = document.querySelectorAll('.comment-card');
      let checkedCount = 0;
      cards.forEach(card => {
        const key = card.getAttribute('data-key');
        const index = parseInt(card.getAttribute('data-index'), 10);
        const isSelected = card.classList.contains('is-selected');
        
        if (selectedCommentsState[key] === undefined) {
          selectedCommentsState[key] = {};
        }
        selectedCommentsState[key][index] = isSelected;
        if (isSelected) checkedCount++;
      });
      
      const copyBtn = document.querySelector('.btn-copy-selected');
      const copyText = document.getElementById('copy-selected-text');
      
      if (copyBtn && copyText) {
        copyText.textContent = \`Copy Selected (\${checkedCount})\`;
        copyBtn.disabled = checkedCount === 0;
      }
      
      // Update select-all checkbox state
      const selectAll = document.getElementById('checkbox-select-all');
      if (selectAll) {
        selectAll.checked = cards.length > 0 && checkedCount === cards.length;
      }
    };

    window.toggleSelectAll = function(selectAllCheckbox) {
      const cards = document.querySelectorAll('.comment-card');
      cards.forEach(card => {
        const key = card.getAttribute('data-key');
        const index = parseInt(card.getAttribute('data-index'), 10);
        
        if (selectAllCheckbox.checked) {
          card.classList.add('is-selected');
        } else {
          card.classList.remove('is-selected');
        }
        
        if (selectedCommentsState[key] === undefined) {
          selectedCommentsState[key] = {};
        }
        selectedCommentsState[key][index] = selectAllCheckbox.checked;
      });
      updateSelectedCommentsCount();
    };

    window.copySelectedComments = function() {
      const cards = document.querySelectorAll('.comment-card.is-selected');
      const selectedComments = [];
      
      cards.forEach(card => {
        const key = card.getAttribute('data-key');
        const index = parseInt(card.getAttribute('data-index'), 10);
        if (comments[key] && comments[key][index]) {
          selectedComments.push({
            key: key,
            comment: comments[key][index]
          });
        }
      });
      
      if (selectedComments.length === 0) {
        showToast("No comments selected");
        return;
      }
      
      let report = \`# Selected Review Feedback for \${fileName}\\n\\n\`;
      report += \`Here is the selected feedback from the review:\\n\\n\`;
      
      const groups = {};
      selectedComments.forEach(item => {
        const section = item.comment.heading || 'General';
        if (!groups[section]) {
          groups[section] = [];
        }
        groups[section].push(item);
      });
      
      Object.keys(groups).forEach(section => {
        report += \`## 📌 Section: "\${section}"\\n\\n\`;
        groups[section].forEach(item => {
          const c = item.comment;
          const isCode = item.key.startsWith('pre-');
          const isGeneric = item.key.startsWith('generic-');
          
          if (!isGeneric && c.context) {
            if (isCode) {
              report += \`> **Context (Code Block):**\\n\`;
              report += '> \\\\x60\\\\x60\\\\x60\\\\n';
              c.context.split('\\n').forEach(line => {
                report += \`> \${line}\\n\`;
              });
              report += '> \\\\x60\\\\x60\\\\x60\\\\n\\\\n';
            } else {
              report += \`> **Context:**\\n\`;
              c.context.split('\\n').forEach(line => {
                report += \`> \${line}\\n\`;
              });
              report += \`\\n\`;
            }
          }
          report += \`**Suggestion:** \${c.text}\\n\\n\`;
          report += \`---\\n\\n\`;
        });
      });
      
      report += \`Generated with Review Tool. Selected action items: \${selectedComments.length}\`;
      
      copyToClipboard(report).then(() => {
        showToast(\`\${selectedComments.length} comment\${selectedComments.length > 1 ? 's' : ''} copied to clipboard!\`);
      }).catch(err => {
        console.error("Failed to copy selected comments: ", err);
      });
    };

    window.editCommentFromDrawer = function(key, index) {
      currentKey = key;
      editingCommentIndex = index;
      
      const comment = comments[key][index];
      const inputEl = document.getElementById('drawer-comment-input');
      inputEl.value = comment.text;
      
      const sendBtn = document.getElementById('btn-drawer-comment-send');
      sendBtn.innerHTML = '<i class="fas fa-check"></i>';
      sendBtn.title = 'Update Comment';
      
      const contextEl = document.getElementById('drawer-input-context');
      const previewEl = document.getElementById('drawer-context-preview');
      
      let contextText = comment.context || '';
      if (!contextText) {
        const el = document.querySelector('[data-comment-key="' + key + '"]');
        contextText = el ? (el.getAttribute('data-comment-context') || el.innerText || el.textContent || '') : '';
      }
      
      if (contextText.trim()) {
        previewEl.textContent = contextText.trim();
        contextEl.style.display = 'flex';
      } else {
        contextEl.style.display = 'none';
      }
      
      autoGrowTextarea(inputEl);
      inputEl.focus();
    };

    window.deleteCommentFromDrawer = function(key, index) {
      if (confirm("Are you sure you want to delete this comment?")) {
        comments[key].splice(index, 1);
        if (comments[key].length === 0) {
          delete comments[key];
          const el = document.querySelector(\`[data-comment-key="\${key}"]\`);
          if (el) {
            el.classList.remove('has-comments');
            const badge = el.querySelector(\`.comment-badge[data-key="\${key}"]\`);
            if (badge) badge.remove();
          }
        }
        if (selectedCommentsState && selectedCommentsState[key]) {
          delete selectedCommentsState[key];
        }
        saveComments();
        renderCommentsDrawer();
        
        if (editingCommentIndex === index && currentKey === key) {
          clearActiveContext();
        }
      }
    };

    window.locateElement = function(key) {
      const el = document.querySelector(\`[data-comment-key="\${key}"]\`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('pulse-highlight');
        void el.offsetWidth; // Trigger DOM reflow to restart keyframe animation
        el.classList.add('pulse-highlight');
        
        if (window.innerWidth <= 992) {
          toggleCommentsDrawer(false);
        }
      }
    };

    function showToast(message) {
      const toast = document.getElementById('comments-toast');
      if (toast) {
        toast.innerHTML = "<i class=\\"fas fa-check-circle\\"></i> " + message;
        toast.classList.add('active');
        setTimeout(() => {
          toast.classList.remove('active');
        }, 2200);
      }
    }

    function copyToClipboard(text) {
      return new Promise((resolve, reject) => {
        // If we are on file:// protocol, directly use fallback copy synchronously
        // because navigator.clipboard requires secure contexts and promises lose user gesture
        if (window.location.protocol === 'file:') {
          if (fallbackCopy(text)) {
            resolve();
          } else {
            reject(new Error("Fallback copy failed"));
          }
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(resolve).catch(err => {
            fallbackCopy(text) ? resolve() : reject(err);
          });
        } else {
          fallbackCopy(text) ? resolve() : reject(new Error("Clipboard API not supported"));
        }
      });
    }

    function fallbackCopy(text) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        document.body.removeChild(textArea);
        return false;
      }
    }

    window.copyToClipboard = copyToClipboard;

    function copyCommentsForClaudeSilently() {
      const report = generateMarkdownReport();
      copyToClipboard(report).then(() => {
        showToast("Comments copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy comments automatically: ", err);
      });
    }

    window.copyCommentsForClaude = function() {
      copyCommentsForClaudeSilently();
    };

    window.downloadCommentsAsFile = function() {
      const report = generateMarkdownReport();
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`${fileName}.review.md\`;
      a.click();
      URL.revokeObjectURL(url);
    };

    window.clearAllComments = function() {
      if (confirm("Are you sure you want to delete all comments for this file? This cannot be undone.")) {
        comments = {};
        saveComments();
        generateElementKeys(document.getElementById('preview'));
        renderCommentsDrawer();
        toggleCommentsDrawer(false);
      }
    };

    // Sanitize Mermaid code to handle stateDiagram colons & tags in labels
    function sanitizeMermaidCode(rawCode) {
      if (!rawCode) return '';
      const lines = rawCode.split('\\n');
      const isStateDiagram = lines.some(l => /^\\s*stateDiagram(-v2)?\\b/.test(l));

      if (isStateDiagram) {
        return lines.map(line => {
          // Check if line is a transition with label: e.g. "A --> B: label text with extra colons or tags"
          const transitionMatch = line.match(/^(\\s*[\\w\\*\\-\\[\\]"\\s]+(?:-->|<--|--|\\.\\.>)[\\w\\*\\-\\[\\]"\\s]+:\\s*)(.*)$/);
          if (transitionMatch) {
            const prefix = transitionMatch[1];
            let label = transitionMatch[2];
            // Escape extra colons in the label to prevent premature DESCR tokens in stateDiagram lexer
            label = label.replace(/:/g, '&#58;');
            // Escape raw angle brackets in label that aren't choice/fork markers
            label = label.replace(/<(?!\<)/g, '&lt;').replace(/(?<!\>)>/g, '&gt;');
            return prefix + label;
          }
          return line;
        }).join('\\n');
      }

      return rawCode;
    }

    // Mermaid diagram renderer with isolated error handling and theme support
    async function renderMermaidDiagrams() {
      const mermaidNodes = document.querySelectorAll('pre.mermaid, div.mermaid');
      if (mermaidNodes.length === 0 || typeof mermaid === 'undefined') return;

      const theme = document.documentElement.getAttribute('data-color-mode');
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true }
      });

      for (let i = 0; i < mermaidNodes.length; i++) {
        const el = mermaidNodes[i];
        if (!el.getAttribute('data-original-code')) {
          el.setAttribute('data-original-code', el.textContent);
        }
        const code = el.getAttribute('data-original-code');
        const cleanCode = sanitizeMermaidCode(code);
        const id = 'mermaid-svg-' + Date.now() + '-' + i;

        try {
          const { svg } = await mermaid.render(id, cleanCode);
          el.innerHTML = svg;
          el.classList.add('mermaid-rendered');
        } catch (err) {
          console.error('Mermaid render error for diagram ' + i + ':', err);
          const stray = document.getElementById(id) || document.getElementById('d' + id);
          if (stray) stray.remove();
          el.innerHTML = \`<div class="mermaid-error-box"><div class="mermaid-error-title"><i class="fas fa-exclamation-triangle"></i> Mermaid Render Error</div><div class="mermaid-error-msg">\${escapeHtml(err.message || String(err))}</div><pre class="mermaid-raw-code"><code>\${escapeHtml(code)}</code></pre></div>\`;
        }
      }
    }

    // 9. Initial Rendering Cascade
    async function initPreview() {
      try {
        calculateStats(markdownText);
        
        // Parse markdown to HTML
        const rawHtml = marked.parse(markdownText);
        const previewEl = document.getElementById('preview');
        previewEl.innerHTML = rawHtml;

        // Resolve any raw <img> elements in markdown that might have relative src
        previewEl.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src');
          if (src && !isExternalOrAbsoluteUrl(src)) {
            const resolved = src.startsWith('/') ? src : resolveRelativePath(baseDir, src);
            img.src = 'file://' + encodeURI(resolved);
          }
          img.onerror = function() {
            this.style.display = 'none';
            const notice = document.createElement('div');
            notice.className = 'image-missing-notice';
            notice.innerHTML = \`<i class="fas fa-image"></i> <span>Image not found: <code>\${escapeHtml(src || '')}</code></span>\`;
            if (this.parentNode) {
              this.parentNode.insertBefore(notice, this.nextSibling);
            }
          };
        });

        // Code syntax highlighting
        hljs.highlightAll();

        // Render Mermaid Diagrams before attaching comment keys
        await renderMermaidDiagrams();

        // Generate TOC
        generateTOC(previewEl);

        // Generate commenting attributes & badges
        generateElementKeys(previewEl);
        setupCommentInteractions();
        updateGlobalCommentCounter();

        // Update toggle icon based on initial viewport and collapsed state
        if (window.innerWidth <= 992) {
          const toggleBtn = document.querySelector('.btn-sidebar-toggle i');
          if (toggleBtn) {
            toggleBtn.className = 'fa-solid fa-bars';
          }
        } else if (document.body.classList.contains('sidebar-hidden')) {
          const toggleBtn = document.querySelector('.btn-sidebar-toggle i');
          if (toggleBtn) {
            toggleBtn.className = 'fa-solid fa-angles-right';
          }
        }
      } catch (err) {
        console.error('Error during preview rendering:', err);
      } finally {
        // Fade out loader
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
      }
    }

    // Start rendering
    initPreview();

    // 10. Sidebar Responsive Toggle
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggleBtn = document.querySelector('.btn-sidebar-toggle');

    function toggleSidebar() {
      if (window.innerWidth <= 992) {
        sidebar.classList.toggle('active');
        const isSidebarActive = sidebar.classList.contains('active');
        
        // Update toggle icon on mobile
        const toggleBtn = sidebarToggleBtn.querySelector('i');
        if (toggleBtn) {
          toggleBtn.className = isSidebarActive ? 'fas fa-times' : 'fa-solid fa-bars';
        }
      } else {
        const body = document.body;
        body.classList.toggle('sidebar-hidden');
        const isHidden = body.classList.contains('sidebar-hidden');
        localStorage.setItem('md_review_sidebar_hidden', isHidden);
        
        // Update toggle icon
        const toggleBtn = sidebarToggleBtn.querySelector('i');
        if (toggleBtn) {
          toggleBtn.className = isHidden ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
        }
      }
    }
    window.toggleSidebar = toggleSidebar;

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 992 && 
          sidebar.classList.contains('active') &&
          !sidebar.contains(e.target) && 
          !sidebarToggleBtn.contains(e.target)) {
        sidebar.classList.remove('active');
        const icon = sidebarToggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      }
    });

  </script>
  <div id="comments-toast"></div>

  <script>
    // Copy HTML helper function in global scope
    window.copyHTML = function() {
      const preview = document.getElementById('preview');
      // Strip comments badge/indicators before copying HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = preview.innerHTML;
      tempDiv.querySelectorAll('.comment-badge').forEach(b => b.remove());
      tempDiv.querySelectorAll('.commentable-element').forEach(el => {
        el.classList.remove('commentable-element', 'has-comments', 'pulse-highlight');
        el.removeAttribute('data-comment-key');
        el.removeAttribute('data-comment-context');
      });
      
      window.copyToClipboard(tempDiv.innerHTML).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.borderColor = '#2da44e';
        btn.style.color = '#2da44e';
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy HTML: ', err);
      });
    };
  </script>
</body>
</html>
`;

// 5. Create temporary file
const tempDir = os.tmpdir();
const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
const tempFilePath = path.join(tempDir, `md_review_${Date.now()}_${safeFileName}.html`);

try {
  fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
} catch (error) {
  console.error(`Error: Failed to write temporary file at "${tempFilePath}"`, error);
  process.exit(1);
}

console.log(`Temporary HTML review preview generated at: "${tempFilePath}"`);

// 6. Open using user's zsh chrome function, with fallback to standard open
const chromeCmd = profile ? `chrome "${profile}" "${tempFilePath}"` : `chrome "${tempFilePath}"`;
const command = `zsh -c "source ${path.join(os.homedir(), 'zsh_profile/.zsh_chrome')} && ${chromeCmd}"`;

console.log(`Running chrome command...`);

exec(command, (err) => {
  if (err) {
    console.warn(`Warning: Failed to open using zsh chrome function. Trying fallback open command...`);
    const fallbackCmd = `open -a "Google Chrome" "${tempFilePath}"`;
    exec(fallbackCmd, (errFallback) => {
      if (errFallback) {
        console.error(`Error: Failed to open Google Chrome. You can open the file manually: "${tempFilePath}"`, errFallback);
        process.exit(1);
      } else {
        console.log(`Review workspace successfully opened in Chrome (via fallback).`);
      }
    });
  } else {
    console.log(`Review workspace successfully opened in Chrome (via chrome function).`);
  }
});
