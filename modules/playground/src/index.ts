import { resolvePlan } from "@plandl/core";
import { parsePlan } from "@plandl/parser";
import { renderSvg } from "@plandl/renderer";

const editor = document.querySelector<HTMLTextAreaElement>("#plandl-editor");
const preview = document.querySelector<HTMLDivElement>("#plandl-preview");
const status = document.querySelector<HTMLParagraphElement>("#plandl-status");
const diagnostics = document.querySelector<HTMLUListElement>("#plandl-diagnostics");

if (editor && preview && status && diagnostics) {
  let scheduled = false;

  const update = () => {
    const parsed = parsePlan(editor.value);
    const plan = resolvePlan(parsed.document, parsed.diagnostics);
    const errors = plan.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    diagnostics.replaceChildren();

    if (errors.length > 0) {
      status.textContent = `${errors.length} ${errors.length === 1 ? "issue" : "issues"} — showing the last valid plan`;
      status.dataset.state = "error";
      for (const diagnostic of errors) {
        const item = document.createElement("li");
        const location = diagnostic.location ? `${diagnostic.location.line}:${diagnostic.location.column} ` : "";
        item.textContent = `${location}${diagnostic.code} ${diagnostic.message}`;
        diagnostics.append(item);
      }
      return;
    }

    preview.innerHTML = renderSvg(plan);
    status.textContent = `Valid · ${plan.walls.length} walls · ${plan.rooms.length} rooms`;
    status.dataset.state = "valid";
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  editor.addEventListener("input", schedule);
  update();
}
