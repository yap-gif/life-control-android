/**
 * A deliberately small, safe Markdown formatter for AI-generated weekly reviews.
 * No innerHTML, no Markdown HTML passthrough, no untrusted links or attributes.
 * Only known DOM elements are created and every model-derived string is textContent.
 */
const MAX_REPLY_LENGTH = 24000;
const INLINE = /(\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|`([^`\n]+)`)/g;

export function parseReviewInline(value) {
  const source = String(value ?? "");
  const tokens = [];
  let start = 0;
  // Use matchAll to avoid stateful shared regexp lastIndex across requests.
  for (const match of source.matchAll(INLINE)) {
    if (match.index > start) tokens.push({ kind: "text", text: source.slice(start, match.index) });
    const kind = match[2] !== undefined || match[3] !== undefined ? "strong" :
      match[4] !== undefined ? "em" : "code";
    tokens.push({ kind, text: match[2] ?? match[3] ?? match[4] ?? match[5] });
    start = match.index + match[0].length;
  }
  if (start < source.length) tokens.push({ kind: "text", text: source.slice(start) });
  return tokens;
}

export function parseReviewMarkdown(markdown) {
  const lines = String(markdown ?? "").slice(0, MAX_REPLY_LENGTH).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let pending = [];
  let code = null;

  function flushParagraph() {
    if (pending.length) {
      blocks.push({ kind: "paragraph", inline: parseReviewInline(pending.join(" ")) });
      pending = [];
    }
  }

  for (const line of lines) {
    if (code !== null) {
      if (/^\s*```\s*$/.test(line)) {
        blocks.push({ kind: "code", text: code.join("\n") });
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (/^\s*```(?:[a-zA-Z0-9_-]+)?\s*$/.test(line)) {
      flushParagraph();
      code = [];
      continue;
    }
    if (!line.trim()) { flushParagraph(); continue; }

    const heading = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", level: heading[1].length, inline: parseReviewInline(heading[2]) });
      continue;
    }
    const bullet = /^\s{0,3}[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\s{0,3}\d{1,3}[.)]\s+(.+)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const listType = ordered ? "ordered" : "unordered";
      let last = blocks[blocks.length - 1];
      if (!last || last.kind !== "list" || last.listType !== listType) {
        last = { kind: "list", listType, items: [] };
        blocks.push(last);
      }
      last.items.push(parseReviewInline((ordered || bullet)[1]));
      continue;
    }
    if (/^\s{2,}\S/.test(line)) {
      const last = blocks[blocks.length - 1];
      if (!pending.length && last?.kind === "list" && last.items.length) {
        const item = last.items[last.items.length - 1];
        item.push({ kind: "text", text: " " });
        item.push(...parseReviewInline(line.trim()));
        continue;
      }
    }
    pending.push(line.trim());
  }
  if (code !== null) blocks.push({ kind: "code", text: code.join("\n") });
  flushParagraph();
  return blocks;
}

export function renderReviewMarkdown(target, markdown) {
  const doc = target.ownerDocument;
  const fragment = doc.createDocumentFragment();
  const appendInline = (parent, tokens) => {
    for (const token of tokens) {
      const tag = ({ strong: "strong", em: "em", code: "code" })[token.kind] || "span";
      const node = doc.createElement(tag);
      node.textContent = token.text;
      parent.appendChild(node);
    }
  };
  for (const block of parseReviewMarkdown(markdown)) {
    if (block.kind === "heading") {
      const heading = doc.createElement("h" + Math.min(block.level + 2, 6));
      appendInline(heading, block.inline);
      fragment.appendChild(heading);
    } else if (block.kind === "paragraph") {
      const paragraph = doc.createElement("p");
      appendInline(paragraph, block.inline);
      fragment.appendChild(paragraph);
    } else if (block.kind === "list") {
      const list = doc.createElement(block.listType === "ordered" ? "ol" : "ul");
      for (const item of block.items) {
        const li = doc.createElement("li");
        appendInline(li, item);
        list.appendChild(li);
      }
      fragment.appendChild(list);
    } else if (block.kind === "code") {
      const pre = doc.createElement("pre");
      const c = doc.createElement("code");
      c.textContent = block.text;
      pre.appendChild(c);
      fragment.appendChild(pre);
    }
  }
  target.replaceChildren(fragment);
}
