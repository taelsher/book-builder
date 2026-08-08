import React, { useState, useCallback } from "react";
import { useMdastNodeUpdater, NestedLexicalEditor } from "@mdxeditor/editor";

function getAttrValue(mdastNode, name) {
  const attr = mdastNode.attributes?.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!attr) return "";
  return typeof attr.value === "string" ? attr.value : "";
}

export function PillButtonEditor({ mdastNode, descriptor }) {
  const updateMdastNode = useMdastNodeUpdater();
  const href = getAttrValue(mdastNode, "href");
  const [localHref, setLocalHref] = useState(href);
  const [showHref, setShowHref] = useState(false);

  React.useEffect(() => {
    setLocalHref(href);
  }, [href]);

  const commitHref = useCallback(
    (value) => {
      const attrs = mdastNode.attributes
        .filter((a) => a.type === "mdxJsxAttribute" && a.name !== "href")
        .concat(
          value
            ? [{ type: "mdxJsxAttribute", name: "href", value }]
            : [],
        );
      updateMdastNode({ attributes: attrs });
    },
    [mdastNode.attributes, updateMdastNode],
  );

  return (
    <span className="pill-button-editor" contentEditable={false}>
      <span
        className="pill-button-preview"
        onClick={() => setShowHref((v) => !v)}
        title="Click to edit link URL"
      >
        <NestedLexicalEditor
          block={false}
          getContent={(node) => node.children}
          getUpdatedMdastNode={(mdastNode, children) => ({
            ...mdastNode,
            children,
          })}
        />
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
          className="pill-button-chevron"
        >
          <path
            clipRule="evenodd"
            d="M6.21967 3.21967C6.51256 2.92678 6.98744 2.92678 7.28033 3.21967L11.5303 7.46967C11.8232 7.76256 11.8232 8.23744 11.5303 8.53033L7.28033 12.7803C6.98744 13.0732 6.51256 13.0732 6.21967 12.7803C5.92678 12.4874 5.92678 12.0126 6.21967 11.7197L9.93934 8L6.21967 4.28033C5.92678 3.98744 5.92678 3.51256 6.21967 3.21967Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
      </span>
      {showHref && (
        <span className="pill-button-href-row">
          <label className="pill-button-href-label">href:</label>
          <input
            className="pill-button-href-input"
            value={localHref}
            onChange={(e) => setLocalHref(e.target.value)}
            onBlur={(e) => commitHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitHref(e.target.value);
                setShowHref(false);
              }
            }}
            placeholder="/path/to/page"
            autoFocus
          />
        </span>
      )}
    </span>
  );
}
