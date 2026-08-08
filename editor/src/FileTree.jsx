import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  FileText,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";
import { cn } from "./lib/utils.js";

function TreeActionButton({ title, destructive, className, ...props }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title={title}
      className={cn(
        "size-5 text-muted-foreground hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function NewFileRow({ onCreate, onCancel }) {
  const [title, setTitle] = useState("");
  return (
    <div className="my-1.5 flex items-center gap-1">
      <Input
        autoFocus
        placeholder="New page title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onCreate(title.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm"
      />
      <TreeActionButton title="Create" onClick={() => title.trim() && onCreate(title.trim())}>
        <Check className="size-3.5" />
      </TreeActionButton>
      <TreeActionButton title="Cancel" onClick={onCancel}>
        <X className="size-3.5" />
      </TreeActionButton>
    </div>
  );
}

function ReorderButtons({ canMoveUp, canMoveDown, onMoveUp, onMoveDown }) {
  return (
    <>
      <TreeActionButton
        title="Move up"
        disabled={!canMoveUp}
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
      >
        <ArrowUp className="size-3.5" />
      </TreeActionButton>
      <TreeActionButton
        title="Move down"
        disabled={!canMoveDown}
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
      >
        <ArrowDown className="size-3.5" />
      </TreeActionButton>
    </>
  );
}

// Reorder swaps only make sense between siblings that both carry a real order value
// (a numeric filename prefix for files, a meta.ts `order` for folders) — pinned
// top-level files like index.mdx/reviews.mdx have neither, so they never get reorder
// buttons. Position is computed within that orderable subset of `siblings`, files and
// folders together, matching how the server sorts (buildTree) and swaps (swapOrder)
// them — a file can move past a folder and vice versa.
function siblingPosition(siblings, node) {
  if (!Number.isFinite(node.order)) return null;
  const group = siblings.filter((n) => Number.isFinite(n.order));
  const idx = group.findIndex((n) => n.path === node.path);
  if (idx === -1) return null;
  return { canMoveUp: idx > 0, canMoveDown: idx < group.length - 1 };
}

function FolderNode({
  node,
  siblings,
  activePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onDeleteFolder,
  onReorderNode,
}) {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const pos = siblingPosition(siblings, node);

  return (
    <div className="py-0.5">
      <div
        className="group flex cursor-pointer items-center justify-between gap-1 rounded px-1 py-1 text-sm font-semibold hover:bg-accent/60"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {open ? (
            <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node.title}</span>
        </span>
        <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          {pos && (
            <ReorderButtons
              canMoveUp={pos.canMoveUp}
              canMoveDown={pos.canMoveDown}
              onMoveUp={() => onReorderNode(node, "up")}
              onMoveDown={() => onReorderNode(node, "down")}
            />
          )}
          <TreeActionButton
            title="New page in this folder"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
              setCreating(true);
            }}
          >
            <Plus className="size-3.5" />
          </TreeActionButton>
          <TreeActionButton
            title="Delete folder"
            destructive
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFolder(node);
            }}
          >
            <X className="size-3.5" />
          </TreeActionButton>
        </span>
      </div>
      {open && (
        <div className="ml-2.5 border-l border-border pl-2.5">
          {creating && (
            <NewFileRow
              onCreate={(title) => {
                onCreateFile(node.path, title);
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
            />
          )}
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              siblings={node.children}
              activePath={activePath}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onReorderNode={onReorderNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode(props) {
  const { node, siblings, onReorderNode } = props;
  if (node.type === "folder") return <FolderNode {...props} />;
  const isActive = node.path === props.activePath;
  const pos = siblingPosition(siblings, node);
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-1 rounded px-1.5 py-1 text-sm",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
      onClick={() => props.onSelectFile(node.path)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.title}</span>
      </span>
      <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        {pos && (
          <ReorderButtons
            canMoveUp={pos.canMoveUp}
            canMoveDown={pos.canMoveDown}
            onMoveUp={() => onReorderNode(node, "up")}
            onMoveDown={() => onReorderNode(node, "down")}
          />
        )}
        <TreeActionButton
          title="Delete page"
          destructive
          onClick={(e) => {
            e.stopPropagation();
            props.onDeleteFile(node);
          }}
        >
          <X className="size-3.5" />
        </TreeActionButton>
      </span>
    </div>
  );
}

export default function FileTree({
  tree,
  activePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onDeleteFolder,
  onCreateFolder,
  onReorderNode,
}) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-muted-foreground">docs/</span>
        <span className="flex items-center">
          <TreeActionButton title="New page" onClick={() => setCreatingFile(true)}>
            <Plus className="size-3.5" />
          </TreeActionButton>
          <TreeActionButton title="New folder" onClick={() => setCreatingFolder(true)}>
            <FolderPlus className="size-3.5" />
          </TreeActionButton>
        </span>
      </div>
      {creatingFile && (
        <NewFileRow
          onCreate={(title) => {
            onCreateFile("", title);
            setCreatingFile(false);
          }}
          onCancel={() => setCreatingFile(false)}
        />
      )}
      {creatingFolder && (
        <NewFileRow
          onCreate={(title) => {
            onCreateFolder(title);
            setCreatingFolder(false);
          }}
          onCancel={() => setCreatingFolder(false)}
        />
      )}
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          siblings={tree}
          activePath={activePath}
          onSelectFile={onSelectFile}
          onCreateFile={onCreateFile}
          onDeleteFile={onDeleteFile}
          onDeleteFolder={onDeleteFolder}
          onReorderNode={onReorderNode}
        />
      ))}
    </div>
  );
}
