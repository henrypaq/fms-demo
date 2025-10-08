# 🧪 Context Menu & Drag-Drop Testing Guide

## 🎯 **What We're Testing**

1. **Context Menu** - Right-click on folders should show app menu (not browser menu)
2. **Drag & Drop** - Drag files/folders to move them between folders

---

## 🔍 **Testing Steps**

### **1. Open Browser Console**
1. Press `Cmd+Option+I` (Mac) or `F12` (Windows)
2. Click **Console** tab
3. Clear console (`Cmd+K`)

### **2. Open a Project**
1. Navigate to http://localhost:5173/
2. Click **"Projects"** in sidebar
3. Open any project (e.g., "Design Projects")

---

## 📝 **Test 1: Context Menu (Sidebar)**

### **Steps:**
1. **Right-click** on any folder in the **left sidebar**
2. **Watch the console**

### **Expected Console Output:**
```
📌 Folder right-clicked: Icons
✅ Calling onFolderContextMenu
🎯 onFolderContextMenu called for: Icons
📍 Setting folder menu at position: 250 350
```

### **Expected Visual:**
- ✅ **Custom context menu appears** at cursor (dark bg, "Rename" and "Delete" options)
- ❌ **NOT the browser's context menu** (Back, Reload Page, Save Page, etc.)

### **If You See Browser Menu:**
Share this console output - it will tell us exactly what's failing!

---

## 📝 **Test 2: Context Menu (Grid)**

### **Steps:**
1. Navigate to **Project Root** (or any folder)
2. **Right-click** on a folder **card** in the main grid
3. **Watch the console**

### **Expected:**
- Same console output as sidebar test
- Custom menu appears at cursor

---

## 📝 **Test 3: Drag & Drop (Folders)**

### **Steps:**
1. **Click and hold** on a folder in the sidebar
2. **Drag** it over another folder (should turn green)
3. **Release** to drop

### **Expected Console Output:**
```
🎬 Drag started: folder abc-123-uuid
📦 Drop event: { draggedItem: {...}, targetFolder: "xyz-456-uuid" }
📁 Moving folder: abc-123-uuid to xyz-456-uuid
```

### **Expected Visual:**
- Folder being dragged shows opacity change
- Target folder highlights in **green**
- After drop, folder **moves** to new location
- Sidebar updates immediately

---

## 📝 **Test 4: Drag & Drop (Files)**

### **Steps:**
1. **Click and hold** on a file card in the grid
2. **Drag** it over a folder in the sidebar (should turn green)
3. **Release** to drop

### **Expected Console Output:**
```
🎬 Drag started: file def-789-uuid
📦 Drop event: { draggedItem: {...}, targetFolder: "xyz-456-uuid" }
📄 Moving file: def-789-uuid to folder xyz-456-uuid
```

### **Expected Visual:**
- File card shows dragging state
- Target folder highlights in **green**
- After drop, file **disappears** from current view
- File appears when you open the target folder

---

## 📝 **Test 5: Move to Project Root**

### **Steps:**
1. **Open a subfolder** (e.g., "Icons")
2. **Drag a file or folder** from inside
3. **Drop it** on **"Project Root"** in the sidebar

### **Expected Console Output:**
```
🎬 Drag started: file/folder uuid
📦 Drop event: { draggedItem: {...}, targetFolder: "Project Root" }
📄/📁 Moving item: uuid to root
```

### **Expected Visual:**
- Item moves to project root
- Item appears when you go back to root level

---

## ⚠️ **Common Issues & Console Messages**

### **Issue: Browser context menu appears**

**Console shows:**
```
📌 Folder right-clicked: Icons
⚠️ onFolderContextMenu not provided!
```
**Fix:** The handler isn't being passed through props. Needs code fix.

---

### **Issue: Nothing happens on right-click**

**Console shows:** (nothing)

**Fix:** Event isn't reaching the handler. Check if there's an element blocking it.

---

### **Issue: Drag doesn't work**

**Console shows:** (nothing when trying to drag)

**Fix:** `draggable` attribute might not be set, or `onDragStart` isn't connected.

---

### **Issue: Drop doesn't work**

**Console shows:**
```
🎬 Drag started: folder abc-123
(nothing on drop)
```

**Fix:** `onDrop` handler isn't firing. Check if `onDragOver` is preventing default.

---

## 📊 **Debugging Checklist**

After testing, check these questions:

- [ ] Does console show "📌 Folder right-clicked" when I right-click?
- [ ] Does console show "✅ Calling onFolderContextMenu"?
- [ ] Does custom menu appear (dark bg, Rename/Delete)?
- [ ] OR does browser menu appear (Back, Reload, etc.)?
- [ ] Does console show "🎬 Drag started" when I drag?
- [ ] Does target folder turn **green** when I drag over it?
- [ ] Does console show "📦 Drop event" when I release?
- [ ] Does console show "📁/📄 Moving" message?
- [ ] Does item actually move to the new location?

---

## 🐛 **Report Issues**

If something doesn't work, share:

1. **Which test failed** (1-5)
2. **Full console output** (copy-paste all emoji messages)
3. **What you saw** (browser menu vs nothing vs custom menu)
4. **Screenshot** (optional but helpful)

---

## ✅ **Success Criteria**

**Context Menu:**
- ✅ Right-click shows **custom menu**, not browser menu
- ✅ "Rename" option works
- ✅ "Delete" option works
- ✅ Menu appears at cursor position

**Drag & Drop:**
- ✅ Drag highlights the dragged item
- ✅ Drop target turns **green**
- ✅ Release completes the move
- ✅ UI updates immediately
- ✅ Works for both files and folders
- ✅ Can move to Project Root

---

**Ready to test!** Open the console and start right-clicking and dragging! 🚀

Every action will be logged, so we can see exactly what's happening.

---

**Last Updated:** 2025-01-08  
**Commit:** `82d2473`  
**Status:** Debug logging added - ready to test

