import { TitleHierarchyEditor } from "./jsx-editors/TitleHierarchyEditor.jsx";
import { PillButtonEditor } from "./jsx-editors/PillButtonEditor.jsx";

// `source` is deliberately omitted on both descriptors: this project's .mdx files never
// contain import statements (TitleHierarchy/PillButton are registered globally via
// components.ts), and MDXEditor only injects an `import { X } from '...'` line into the
// serialized output when a descriptor has a `source` — omitting it keeps round-trips
// byte-for-byte free of imports Blume would otherwise choke on. Verified via spike.
export const jsxComponentDescriptors = [
  {
    name: "TitleHierarchy",
    kind: "text",
    props: [
      { name: "chapterTitle", type: "string" },
      { name: "chapterNumber", type: "expression" },
      { name: "title", type: "string" },
    ],
    hasChildren: false,
    Editor: TitleHierarchyEditor,
  },
  {
    name: "PillButton",
    kind: "text",
    props: [{ name: "href", type: "string" }],
    hasChildren: true,
    Editor: PillButtonEditor,
  },
];
