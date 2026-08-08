import { defineConfig } from "blume";

export default defineConfig({
  title: "The Network State",
  // The reference site has no "Was this page helpful?" widget.
  feedback: false,
  description:
    "Technology has enabled us to start new companies, new communities, and new currencies. But can we use it to start new cities, or even new countries? This book explains how to build the successor to the nation state, a concept we call the network state.",
  logo: {
    // Blume would inline a single .svg (relying on currentColor for dark
    // mode), but this file has hardcoded fill="black"/"white" paths. The
    // Logo layout override below renders it as a plain <img class="icon-invert">
    // instead — the reference site's own dark-mode mechanism — so this
    // config value only feeds alt/href/OG metadata, not the inline path.
    image: "/images/thenetworkstate.svg",
    text: "",
  },

  content: {
    root: "docs",
  },

  // Placeholder — this build is local/unpublished (see tier-1-implementation-plan.md).
  // Set to the real domain before any public deployment.
  deployment: {
    site: "http://localhost:4321",
  },

  theme: {
    mode: "system",
    fonts: {
      display: {
        name: "valkyrieFont",
        variants: [
          { src: "./reference/fonts/valkyrie-regular.woff2", weight: 400, style: "normal" },
          { src: "./reference/fonts/valkyrie-a-regular.woff2", weight: 600, style: "normal" },
          { src: "./reference/fonts/valkyrie-bold.woff2", weight: 700, style: "normal" },
          { src: "./reference/fonts/valkyrie-italic.woff2", weight: 400, style: "italic" },
          { src: "./reference/fonts/valkyrie-bold-italic.woff2", weight: 700, style: "italic" },
        ],
        fallback: "serif",
      },
      body: {
        name: "valkyrieFont",
        variants: [
          { src: "./reference/fonts/valkyrie-regular.woff2", weight: 400, style: "normal" },
          { src: "./reference/fonts/valkyrie-a-regular.woff2", weight: 600, style: "normal" },
          { src: "./reference/fonts/valkyrie-bold.woff2", weight: 700, style: "normal" },
          { src: "./reference/fonts/valkyrie-italic.woff2", weight: 400, style: "italic" },
          { src: "./reference/fonts/valkyrie-bold-italic.woff2", weight: 700, style: "italic" },
        ],
        fallback: "serif",
      },
      // Repurposed as the UI-chrome role (header, nav, buttons) — see DECISIONS.md.
      mono: "inter",
    },
    background: {
      light: "#ffffff",
      dark: "#17202A",
    },
    accent: "#1e83d2",
  },

  seo: {
    contentSignals: true,
  },
});
