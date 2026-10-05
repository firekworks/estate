import ts from "typescript";
import fs from "node:fs/promises";
const output = process.argv[2] || "docs/qa/decision-flow/strings.json";
const rows = [];
for (const name of await fs.readdir("src/components")) {
  if (!name.endsWith(".tsx")) continue;
  const file = `src/components/${name}`,
    source = await fs.readFile(file, "utf8"),
    tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
  function visit(node) {
    if (ts.isJsxText(node) || ts.isStringLiteral(node)) {
      const value = (ts.isJsxText(node) ? node.getText(tree) : node.text)
        .replace(/\s+/g, " ")
        .trim();
      const attr = ts.isJsxAttribute(node.parent)
        ? node.parent.name.getText(tree)
        : null;
      if (
        value &&
        (ts.isJsxText(node) ||
          ["title", "copy", "label", "placeholder", "aria-label"].includes(
            attr,
          ))
      ) {
        let disclosure = false;
        for (let p = node.parent; p; p = p.parent)
          if (
            ts.isJsxElement(p) &&
            ["details", "dialog"].includes(
              p.openingElement.tagName.getText(tree),
            )
          )
            disclosure = true;
        rows.push({
          file,
          line:
            tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1,
          text: value,
          location: disclosure ? "disclosure" : "candidate-visible",
          review:
            attr === "aria-label"
              ? "accessible-name"
              : /error|falta|pendiente|riesgo|evidencia/i.test(value)
                ? "context-critical"
                : "decision-or-disclosure",
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
await fs.writeFile(output, JSON.stringify(rows, null, 2));
console.log(`${rows.length} strings → ${output}`);
