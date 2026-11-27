import { resolvePlan } from "@plandl/core";
import { parsePlan } from "@plandl/parser";
import { renderSvg } from "@plandl/renderer";
import { gridPreference, setGridPreference } from "./grid-preference.js";

const editor = document.querySelector<HTMLTextAreaElement>("#plandl-editor");
const preview = document.querySelector<HTMLDivElement>("#plandl-preview");
const status = document.querySelector<HTMLParagraphElement>("#plandl-status");
const diagnostics = document.querySelector<HTMLUListElement>("#plandl-diagnostics");
const gridToggle = document.querySelector<HTMLInputElement>("#plandl-grid");

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

    preview.innerHTML = renderSvg(plan, { grid: gridToggle?.checked ?? false });
    const warnings = plan.diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
    status.textContent = `Valid · ${plan.rooms.length} rooms · ${warnings.length === 0 ? "no warnings" : `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`}`;
    status.dataset.state = warnings.length === 0 ? "valid" : "warning";
    for (const diagnostic of warnings) {
      const item = document.createElement("li");
      item.dataset.severity = "warning";
      const location = diagnostic.location ? `${diagnostic.location.line}:${diagnostic.location.column} ` : "";
      item.textContent = `${location}${diagnostic.code} ${diagnostic.message}`;
      diagnostics.append(item);
    }
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
  if (gridToggle) {
    gridToggle.checked = gridPreference();
    gridToggle.addEventListener("change", () => {
      setGridPreference(gridToggle.checked);
      update();
    });
  }
  update();
}
