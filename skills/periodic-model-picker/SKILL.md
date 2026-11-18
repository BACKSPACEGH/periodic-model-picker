---
name: periodic-model-picker
description: Opens the interactive 118-element Model Periodic Table sidecar panel in Antigravity to select Gemini 4 element models (Hydrogen, Carbon, Argon + Thinking levels) or switch swarm models. Use when the user asks to open the periodic table model selector, choose an element model, or runs /periodic-model-picker.
---

# Model Periodic Table Selector

Use this skill when the user wants to browse or pick models via the **Gemini 4 Model Periodic Table** (`1 H` Hydrogen, `6 C` Carbon, `18 Ar` Argon, plus all 118 elements and thinking levels).

## 1. Open the Interactive Periodic Table Panel

Always include the clickable sidecar pill in your response so the user can open the interactive Periodic Table in Antigravity's side pane with one click:

```markdown
[Model Periodic Table](sidecar://periodic-model-picker/periodic-table/)
```

## 2. Gemini 4 Element Model Reference

| Element | Atomic # | Model Name | Specialty | Antigravity Model IDs |
| :--- | :--- | :--- | :--- | :--- |
| **H** | 1 | **Gemini 4 Hydrogen** | Everyday help | `gemini-4-hydrogen-low`, `gemini-4-hydrogen-medium`, `gemini-4-hydrogen-high`, `gemini-4-hydrogen-xhigh` |
| **C** | 6 | **Gemini 4 Carbon** | Most complex work | `gemini-4-carbon-low`, `gemini-4-carbon-medium`, `gemini-4-carbon-high` |
| **Ar** | 18 | **Gemini 4 Argon** | Code and analysis | `gemini-4-argon-low`, `gemini-4-argon-medium`, `gemini-4-argon-high` |

## 3. Switching Models in Swarm Sessions

If the user asks to switch your current model or a swarm worker's model to a chosen element (e.g., "Switch to Argon High" or "Use Hydrogen Medium"), call the `swarm` tool with `action: "model"` and the mapped model ID (for example `model: "gemini-4-argon-high"`). For regular single-agent conversations, remind the user they can launch a new chat directly from the [Model Periodic Table](sidecar://periodic-model-picker/periodic-table/) pane or pick the element in **Settings → Model Selection**.
