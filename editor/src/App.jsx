import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import FileTree from "./FileTree.jsx";
import Editor from "./Editor.jsx";
import { api } from "./api.js";
import { Button } from "./components/ui/button.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog.jsx";

function findNode(nodes, targetPath) {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.type === "folder") {
      const found = findNode(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

export default function App() {
  const [tree, setTree] = useState([]);
  const [liveSiteOrigin, setLiveSiteOrigin] = useState("");
  const [activePath, setActivePath] = useState(null);
  const [file, setFile] = useState(null); // { content, mtimeMs, route }
  const [dirty, setDirty] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: "file" | "folder", node }
  const [discardTarget, setDiscardTarget] = useState(null); // path to switch to after discard
  const editorRef = useRef(null);
  const pendingMarkdown = useRef(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const refreshTree = useCallback(() => {
    api.getTree().then((res) => {
      setTree(res.tree);
      setLiveSiteOrigin(res.liveSiteOrigin);
    });
  }, []);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  // Load a file without checking dirty state (used after discard confirmation)
  const loadFile = useCallback((path) => {
    api.getFile(path).then((res) => {
      setActivePath(path);
      setFile(res);
      setDirty(false);
    });
  }, []);

  // Guard page switches with a discard confirmation when dirty
  const selectFile = useCallback(
    (path) => {
      if (dirtyRef.current) {
        setDiscardTarget(path);
        return;
      }
      loadFile(path);
    },
    [loadFile],
  );

  const reloadActiveFile = useCallback(async () => {
    if (!activePath) return;
    const res = await api.getFile(activePath);
    setFile(res);
    setDirty(false);
    editorRef.current?.setMarkdown(res.content);
  }, [activePath]);

  const handleSave = async (overwrite = false) => {
    const markdown = editorRef.current?.getMarkdown();
    if (markdown == null || !activePath) return;
    try {
      const res = await api.saveFile(activePath, markdown, overwrite ? undefined : file.mtimeMs);
      setFile((f) => ({ ...f, content: markdown, mtimeMs: res.mtimeMs }));
      setDirty(false);
      toast.success("Saved.");
    } catch (err) {
      if (err.status === 409) {
        pendingMarkdown.current = markdown;
        setConflictOpen(true);
      } else {
        toast.error(`Save failed: ${err.message}`);
      }
    }
  };

  // ── Cmd/Ctrl+S keyboard shortcut ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirtyRef.current) handleSave(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── beforeunload guard ──
  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleCreateFile = async (folder, title) => {
    try {
      await api.createFile(folder, title);
      toast("Page created — Blume is restarting its dev server…");
      refreshTree();
    } catch (err) {
      toast.error(`Create failed: ${err.message}`);
    }
  };

  const handleCreateFolder = async (title) => {
    try {
      await api.createFolder(title);
      toast("Folder created — Blume is restarting its dev server…");
      refreshTree();
    } catch (err) {
      toast.error(`Create failed: ${err.message}`);
    }
  };

  const handleDeleteFile = (node) => setDeleteTarget({ type: "file", node });

  const handleDeleteFolder = (node) => setDeleteTarget({ type: "folder", node });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, node } = deleteTarget;
    setDeleteTarget(null);
    try {
      if (type === "file") {
        await api.deleteFile(node.path);
        if (activePath === node.path) {
          setActivePath(null);
          setFile(null);
        }
        toast("Page deleted — Blume is restarting its dev server…");
      } else {
        await api.deleteFolder(node.path);
        if (activePath?.startsWith(node.path)) {
          setActivePath(null);
          setFile(null);
        }
        toast("Folder deleted — Blume is restarting its dev server…");
      }
      refreshTree();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleReorderNode = async (node, direction) => {
    try {
      const res = await api.reorderNode(node.path, direction);
      if (!res.moved) return;
      // Reordering can renumber every sibling after the tie point, not just the two
      // entries swapped — so the currently open file may have been renamed even
      // though it wasn't the one the user clicked reorder on.
      const renamedActive = res.renamedPaths?.find((r) => r.from === activePath);
      if (renamedActive) setActivePath(renamedActive.to);
      toast("Reordered — Blume is restarting its dev server…");
      refreshTree();
    } catch (err) {
      toast.error(`Reorder failed: ${err.message}`);
    }
  };

  // ── Resizable sidebar ──
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isDragging = useRef(false);

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const handle = e.currentTarget;
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(480, Math.max(180, e.clientX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      isDragging.current = false;
      handle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const activeNode = activePath ? findNode(tree, activePath) : null;

  return (
    <>
      <div className="sidebar" style={{ width: sidebarWidth }}>
        <FileTree
          tree={tree}
          activePath={activePath}
          onSelectFile={selectFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
          onReorderNode={handleReorderNode}
        />
      </div>
      <div className="resize-handle" onMouseDown={onResizeStart} />
      <div className="main">
        {file ? (
          <>
            <div className="toolbar-row">
              <strong>{activeNode?.title ?? activePath}</strong>
              {dirty && (
                <span className="unsaved-indicator">
                  <span className="unsaved-dot" />
                  Unsaved
                </span>
              )}
              {liveSiteOrigin && file.route && (
                <a href={`${liveSiteOrigin}${file.route}`} target="_blank" rel="noreferrer">
                  View live ↗
                </a>
              )}
              <span style={{ flex: 1 }} />
              <Button onClick={() => handleSave(false)}>Save</Button>
            </div>
            <div className="editor-scroll">
              <Editor
                key={activePath}
                ref={editorRef}
                markdown={file.content}
                onChange={() => setDirty(true)}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">Select a page from the left, or create a new one.</div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "folder" ? "folder" : "page"} "{deleteTarget?.node.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? "This will delete the folder and everything inside it. This cannot be undone."
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This file changed on disk</AlertDialogTitle>
            <AlertDialogDescription>
              It was modified since you opened it here. Reload to see the latest version (discarding your
              changes), or overwrite it with what you have in the editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                reloadActiveFile();
              }}
            >
              Reload
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSave(true);
                setConflictOpen(false);
              }}
            >
              Overwrite anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!discardTarget} onOpenChange={(open) => !open && setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits on this page. Switching will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = discardTarget;
                setDiscardTarget(null);
                loadFile(target);
              }}
            >
              Discard & switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
