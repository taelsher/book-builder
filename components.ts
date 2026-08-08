import { defineComponents } from "blume";
import Empty from "blume/components/layout/Empty.astro";
import Header from "./src/components/Header.astro";
import Logo from "./src/components/Logo.astro";
import Pagination from "./src/components/Pagination.astro";
import PillButton from "./src/components/PillButton.astro";
import TableOfContents from "./src/components/TableOfContents.astro";
import TitleHierarchy from "./src/components/TitleHierarchy.astro";

export default defineComponents({
  mdx: {
    TitleHierarchy,
    PillButton,
  },
  layout: {
    Header,
    Logo,
    Pagination,
    TableOfContents,
    // The reference site shows only the large chapter title (rendered here
    // by TitleHierarchy, an MDX component at the top of each page) — Blume's
    // default small "eyebrow" breadcrumb above it doesn't exist on the live
    // site and duplicated the chapter name, so it's suppressed here.
    Breadcrumbs: Empty,
  },
});
