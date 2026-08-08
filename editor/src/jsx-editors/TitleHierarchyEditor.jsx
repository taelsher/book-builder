import React, { useState, useCallback, useRef, useEffect } from "react";
import { useMdastNodeUpdater } from "@mdxeditor/editor";

function getAttrValue(mdastNode, name, descriptor) {
  const attr = mdastNode.attributes?.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!attr) return "";
  const propDef = descriptor.props.find((p) => p.name === name);
  if (propDef?.type === "expression" && attr.value && typeof attr.value === "object") {
    return attr.value.value ?? "";
  }
  return typeof attr.value === "string" ? attr.value : "";
}

function buildAttributes(values, descriptor) {
  return Object.entries(values).reduce((acc, [name, value]) => {
    if (value === "") return acc;
    const propDef = descriptor.props.find((p) => p.name === name);
    if (propDef?.type === "expression") {
      acc.push({
        type: "mdxJsxAttribute",
        name,
        value: { type: "mdxJsxAttributeValueExpression", value },
      });
    } else {
      acc.push({ type: "mdxJsxAttribute", name, value });
    }
    return acc;
  }, []);
}

/** Auto-resize a textarea to fit its content (no scrollbar), handling resize events. */
function useAutoSize(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const adjust = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };
    adjust();
    const ro = new ResizeObserver(adjust);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, value]);
}

export function TitleHierarchyEditor({ mdastNode, descriptor }) {
  const updateMdastNode = useMdastNodeUpdater();

  const chapterTitle = getAttrValue(mdastNode, "chapterTitle", descriptor);
  const chapterNumber = getAttrValue(mdastNode, "chapterNumber", descriptor);
  const title = getAttrValue(mdastNode, "title", descriptor);

  const [localChapterTitle, setLocalChapterTitle] = useState(chapterTitle);
  const [localChapterNumber, setLocalChapterNumber] = useState(chapterNumber);
  const [localTitle, setLocalTitle] = useState(title);
  const pageTitleRef = useRef(null);

  useAutoSize(pageTitleRef, localTitle);

  // Sync from mdastNode when it changes externally
  React.useEffect(() => {
    setLocalChapterTitle(chapterTitle);
  }, [chapterTitle]);
  React.useEffect(() => {
    setLocalChapterNumber(chapterNumber);
  }, [chapterNumber]);
  React.useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const commit = useCallback(
    (field, value) => {
      const current = {
        chapterTitle: localChapterTitle,
        chapterNumber: localChapterNumber,
        title: localTitle,
      };
      current[field] = value;
      updateMdastNode({
        attributes: buildAttributes(current, descriptor),
      });
    },
    [localChapterTitle, localChapterNumber, localTitle, updateMdastNode, descriptor],
  );

  return (
    <div className="title-hierarchy-editor" contentEditable={false}>
      <input
        className="th-chapter-title"
        value={localChapterTitle}
        onChange={(e) => setLocalChapterTitle(e.target.value)}
        onBlur={(e) => commit("chapterTitle", e.target.value)}
        placeholder="Chapter Title"
      />
      <div className="th-chapter-number-row">
        <div className="th-rule" />
        <span className="th-chapter-number-wrap">
          <span className="th-chapter-number-prefix">Chapter&nbsp;</span>
          <input
            className="th-chapter-number"
            style={{ width: `${Math.max(1, String(localChapterNumber).length)}ch` }}
            value={localChapterNumber}
            onChange={(e) => setLocalChapterNumber(e.target.value)}
            onBlur={(e) => commit("chapterNumber", e.target.value)}
            placeholder="#"
          />
        </span>
        <div className="th-rule" />
      </div>
      <textarea
        ref={pageTitleRef}
        className="th-page-title"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={(e) => commit("title", e.target.value)}
        placeholder="Page Title"
        rows={1}
      />
    </div>
  );
}


