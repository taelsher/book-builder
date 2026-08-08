import React, { forwardRef } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  frontmatterPlugin,
  markdownShortcutPlugin,
  jsxPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  imagePlugin,
  diffSourcePlugin,
  searchPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  ChangeCodeMirrorLanguage,
  ListsToggle,
  ConditionalContents,
  DiffSourceToggleWrapper,
  ButtonWithTooltip,
  useEditorSearch,
} from "@mdxeditor/editor";
import { jsxComponentDescriptors } from "./jsxComponents.js";
import { api } from "./api.js";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";

// No admonitions/directives plugin here on purpose: Blume's markdown pipeline has no
// remark-directive support, so `:::note`-style syntax would edit fine in the WYSIWYG
// but render as broken literal text on the live site. Not offering it avoids that trap.
const CODE_BLOCK_LANGUAGES = {
  "": "Plain text",
  js: "JavaScript",
  jsx: "JavaScript (JSX)",
  ts: "TypeScript",
  tsx: "TypeScript (TSX)",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  bash: "Bash",
  python: "Python",
  yaml: "YAML",
  markdown: "Markdown",
};

const isCodeBlockEditor = (editor) => editor?.editorType === "codeblock";

function SearchWidget() {
  const { isSearchOpen, toggleSearch, closeSearch, search, setSearch, next, prev, total, cursor } =
    useEditorSearch();
  return (
    <>
      <ButtonWithTooltip title="Find in page" onClick={toggleSearch}>
        🔍
      </ButtonWithTooltip>
      {isSearchOpen && (
        <div className="fixed top-24 right-5 z-[900] flex items-center gap-1 rounded-md border bg-popover p-1.5 shadow-md">
          <Input
            autoFocus
            placeholder="Find in page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.shiftKey ? prev() : next());
              if (e.key === "Escape") closeSearch();
            }}
            className="h-7 w-40 text-sm"
          />
          <span className="min-w-9 text-center text-xs text-muted-foreground">
            {total > 0 ? `${cursor}/${total}` : "0/0"}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            title="Previous match"
            onClick={prev}
            disabled={total === 0}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" title="Next match" onClick={next} disabled={total === 0}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" title="Close" onClick={closeSearch}>
            <X className="size-3.5" />
          </Button>
        </div>
      )}
    </>
  );
}

const Editor = forwardRef(function Editor({ markdown, onChange }, ref) {
  return (
    <MDXEditor
      ref={ref}
      markdown={markdown}
      onChange={onChange}
      contentEditableClassName="prose max-w-none focus:outline-none"
      plugins={[
        frontmatterPlugin(),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        imagePlugin({
          imageUploadHandler: async (image) => {
            const res = await api.uploadImage(image);
            return res.url;
          },
        }),
        codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
        codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
        searchPlugin(),
        markdownShortcutPlugin(),
        jsxPlugin({ jsxComponentDescriptors }),
        diffSourcePlugin({ viewMode: "rich-text" }),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper>
              <ConditionalContents
                options={[
                  { when: isCodeBlockEditor, contents: () => <ChangeCodeMirrorLanguage /> },
                  {
                    fallback: () => (
                      <>
                        <UndoRedo />
                        <BoldItalicUnderlineToggles />
                        <CodeToggle />
                        <BlockTypeSelect />
                        <ListsToggle />
                        <CreateLink />
                        <InsertImage />
                        <InsertTable />
                        <InsertThematicBreak />
                        <InsertCodeBlock />
                        <SearchWidget />
                      </>
                    ),
                  },
                ]}
              />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
  );
});

export default Editor;
