# Automated Study Notes PDF Generator (AJCeduttech)

An automated toolchain built using n8n and Puppeteer to convert raw Notion-exported HTML study notes into beautifully styled, branded, and print-ready multi-page **A4 PDF documents** matching the official brand design guidelines of **Anujjindal.in**.

## Features

- **Branded A4 Styling**: Automatically applies brand colors (Primary Blue: `#1B71AC`, Primary Green: `#2AB573`), header logos, and centered watermarks (`LOGO-CROP.png` at 12% opacity) on every page.
- **Two-Column Flow Layout**: Standard text flow maps naturally across A4 dimensions using CSS columns (`column-count: 2`, `column-gap: 28px`), shifting text seamlessly from column to column and page to page.
- **Wide Tables Auto-Spanning**: Automatically breakout wide Notion tables (`column-span: all`) to span the full width across both columns to prevent squishing and ensure high readability.
- **Notion Callouts Conversion**: Notion `.callout` elements are parsed and styled as custom **Knowledge Nuggets** with light green backgrounds, rocket/pin icons, and custom borders.
- **Header & Footer Print Templates**: Utilizes Puppeteer's PDF printing engine to render running headers (with base64 logo on the left and subject/chapter on the right) and running footers (with page number in a green box on the right).
- **Offline Safe Logo Embedding**: Dynamic fetch-to-base64 conversions embed the logo natively in memory, preventing broken logo links during offline rendering.

---

## Folder Structure

```text
AJCeduttech/
├── README.md                 # Setup, usage documentation, and explanations
├── package.json              # Node.js dependencies (Puppeteer, PyMuPDF for visual tests)
├── template_pdf.html         # Base A4 layout template with style classes
├── renderer_pdf.js           # Core PDF printer engine driven by Puppeteer
├── workflow_pdf.json         # Complete n8n workflow definition ready for import
└── output/                   # Directory where generated PDF guides are saved
```

---

## Prerequisites

- **Node.js**: Version 18+ is recommended (uses native `fetch` API).
- **npm**: Installed with Node.js.
- **n8n**: Running self-hosted or local instance.

---

## Installation & Setup

1. Navigate to the `AJCeduttech` directory:
   ```bash
   cd "/Users/saieshwarrampelli/Downloads/LevelUp/AJCeduttech"
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```

---

## Running the PDF Renderer Locally

You can run the PDF renderer manually by pointing to any Notion HTML file and specifying an output PDF path:

```bash
# General Command:
node renderer_pdf.js <input_html_path> <output_pdf_path>

# Test with the project task notes:
node renderer_pdf.js "/Users/saieshwarrampelli/Downloads/Anuj Jindal Task/Notes Economic Growth and Development 118b820004a246028d53c0d80e25b5f3.html" "output/Economic_Growth_and_Development.pdf"
```

---

## n8n Workflow Configuration

### 1. Import the Workflow
1. Open your n8n workspace.
2. Click on the **Workflow Settings Menu** (three dots in top-right).
3. Select **Import from File**.
4. Choose the `workflow_pdf.json` file located in `AJCeduttech`.

### 2. API / Webhook Call Example

Send a `POST` request to the Webhook Trigger endpoint:

```bash
curl -X POST http://localhost:5678/webhook/render-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "inputHtmlPath": "/Users/saieshwarrampelli/Downloads/Anuj Jindal Task/Notes Economic Growth and Development 118b820004a246028d53c0d80e25b5f3.html",
    "outputPath": "/Users/saieshwarrampelli/Downloads/LevelUp/AJCeduttech/output/Economic_Growth_and_Development.pdf"
  }' --output output_guide.pdf
```
n8n will return the generated PDF file binary, allowing immediate viewing/saving.

---

## Technical Design & Layout Controls

- **Page Breaks Prevention**: CSS print directives `break-inside: avoid` apply to figures, tables, list blocks, and callout containers to prevent awkward split content. Major headings use `break-after: avoid` to prevent orphan headings.
- **Image URL Rewriting**: The renderer parses HTML content and converts relative image paths (e.g., `Untitled.png`) into absolute local paths (e.g., `file:///Users/saieshwarrampelli/Downloads/Anuj Jindal Task/Untitled.png`), ensuring Puppeteer resolves local assets correctly.
- **High Contrast Styling**: Select colors and spacing conform to the official design reference (`Design Reference File.pdf`). Blue `#1B71AC` represents the main headers, and Green `#2AB573` represents sub-headers, bullets, and highlight markers.
