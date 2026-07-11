# Markdown Review Tool 📝

A lightweight, interactive review tool to read markdown documents (like Claude implementation plans or specifications) and add inline feedback. When you're done, you can export all your comments with full context in a structured format optimized to pass back to Claude.

Runs completely in the browser as a self-contained, offline-friendly workspace.

---

## ✨ Features

- **Block-Level Comments**: Hover over any heading, paragraph, list item, code block, or table row to display a floating `+` button in the left gutter to add a comment.
- **Visual Context & Highlights**: Commented elements get a primary-colored left border and an interactive comment badge.
- **Review Drawer (Right Sidebar)**: Toggleable side panel that displays all feedback, grouped by the document section where they were added.
- **Visual Crosshairs / Scroll-To**: Click "Locate" on any comment card to instantly scroll to and pulse-highlight that element in the document.
- **Full Comment CRUD**: Add, edit, and delete comments on the fly inside the modal or review drawer.
- **Full-Context Claude Export**: Copy all feedback to your clipboard formatted perfectly as Markdown blockquotes, grouped by section, ready for Claude to read and execute.
- **Offline / Zero Setup**: Runs entirely on static HTML. Comments are persisted in Chrome's `localStorage` mapped to the absolute path of the file you're reviewing, so your comments survive page reloads and browser restarts.

---

## ⚙️ Setup & Installation

This tool consists of a single self-contained Node.js script with zero external package dependencies (all frontend libraries are loaded via CDN).

### 1. Make the Script Executable
Give the script execution permissions:
```bash
chmod +x preview-markdown.js
```

### 2. Configure the `mdreview` Command
You can make the command globally available using either a shell function or a symbolic link:

#### Option A: Shell Function (Recommended)
Add the following function to your shell profile configuration (e.g., `~/.zshrc` or `~/.bashrc`):

```bash
# Add this function to your shell config file (~/.zshrc or ~/.bashrc)
mdreview() {
    if [ -z "$1" ]; then
        echo "Usage: mdreview <markdown-file-path> [profile]"
        echo "Example: mdreview plan.md"
        return 1
    fi
    node "/path/to/review-tool/preview-markdown.js" "$1" "$2"
}
```
*(Make sure to replace `/path/to/review-tool` with the absolute path to where you cloned this repository.)*

Reload your terminal session or run:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

#### Option B: Symlink (Global PATH)
Create a symlink to the script in a folder already inside your system's `$PATH`, such as `/usr/local/bin`:
```bash
sudo ln -s "$(pwd)/preview-markdown.js" /usr/local/bin/mdreview
```

---

## 🚀 How to Run

To start a review, run the `mdreview` command followed by the path of the markdown file:

```bash
mdreview example-plan.md
```

This will parse the markdown, generate a temporary preview HTML page in your system's temp directory, and automatically open it in Google Chrome.

---

## 🛠 How to Use the UI

### Adding a Comment
1. Hover your mouse over any element (e.g. paragraph, header, code block, list item).
2. A blue `+` button will appear to the left of the hovered element.
3. Click the `+` button to open the comment modal.
4. Type your suggestion and hit **Save Comment**.

### Managing Comments
- **Open Drawer**: Click the chat bubble icon in the top-right floating controls to toggle the review drawer.
- **Locate Element**: In the drawer, click the **Locate** icon (crosshairs) on any card to scroll directly to the commented element with a pulsing visual highlight.
- **Edit/Delete**: Click the **Edit** (pencil) or **Delete** (trash) icon on any card inside the drawer to modify or remove feedback.
- **Single Comment Copy**: Click the **Copy** icon directly on any comment card inside the drawer to copy just that single comment with context to the clipboard in 1 click.

### Exporting to Claude
- **Copy Selected Set**: Click/tap on any comment card itself to select or deselect it (selected cards feature a premium background and border tint). Then click **Copy Selected (N)** at the top of the drawer. Use the **Select All** checkbox in the bulk action bar to toggle all comments at once.
- **Copy All**: Click **Copy All for Claude** at the bottom of the drawer to copy the complete report to your clipboard formatted like this:
  ```markdown
  # Review Feedback for example-plan.md
  
  ## 📌 Section: "1. Core Logic Setup"
  
  > **Context (Code Block):**
  > ```
  > class FeatureXService {
  >   constructor(config) {
  > ...
  > ```
  
  **Suggestion:** We should extract config validation into a separate validateConfig helper.
  ```
- **Save**: Click **Save Report** to download the review report as a standalone `.review.md` file.
- **Clear All**: Click **Clear All** to remove all comments for this file from local storage.

---

## 🎨 Aesthetics & Technology
- Built using **Node.js** for command execution and temp-file rendering.
- Powered by **Marked.js** for markdown parsing, **Highlight.js** for code formatting, and **Mermaid.js** for flowcharts.
- Sleek dark/light theme switching with glassmorphic drawers, CSS animations, and Outfit/Fira Code typography.
