const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// CLI Arguments: node renderer_pdf.js <input_html_path> <output_pdf_path>
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node renderer_pdf.js <input_html_path> <output_pdf_path>');
  process.exit(1);
}

const inputHtmlPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Fetch header logo and convert to base64 dynamically for Puppeteer header template
async function getBase64FromUrl(url) {
  try {
    console.log(`Fetching logo for base64 encoding: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('Failed to fetch logo for base64 encoding, using raw URL instead:', err.message);
    return url;
  }
}

(async () => {
  let browser;
  try {
    if (!fs.existsSync(inputHtmlPath)) {
      throw new Error(`Input HTML file not found at: ${inputHtmlPath}`);
    }

    console.log('Reading raw HTML notes...');
    const rawNotionHtml = fs.readFileSync(inputHtmlPath, 'utf8');

    // Load templates paths
    const templatePath = path.resolve(__dirname, 'template_pdf.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at ${templatePath}`);
    }

    // Fetch and base64-encode the header logo
    const logoUrl = 'https://anujjindal.in/wp-content/uploads/2022/05/LOGO-FULL-01.png';
    const headerLogoBase64 = await getBase64FromUrl(logoUrl);

    console.log('Launching Puppeteer browser for PDF rendering...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: 794,  // A4 standard width in px at 96 DPI
      height: 1123, // A4 standard height in px at 96 DPI
      deviceScaleFactor: 1
    });

    console.log(`Loading base HTML template: file://${templatePath}`);
    await page.goto(`file://${templatePath}`, { waitUntil: 'load' });

    // Inject and parse Notion content inside page DOM
    console.log('Injecting notes content and resolving relative resource paths...');
    const inputDir = path.dirname(inputHtmlPath);

    await page.evaluate((htmlContent, resourceDir) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      // Extract the Notion notes body content (usually inside .page-body or fallback to body)
      const pageBody = tempDiv.querySelector('.page-body') || tempDiv.querySelector('body') || tempDiv;

      // Clean up Notion TOC and main Notion header if present
      const toc = pageBody.querySelector('nav.table_of_contents');
      if (toc) toc.remove();

      const header = pageBody.querySelector('header');
      if (header) header.remove();

      // Resolve relative images in HTML notes to absolute file:// paths
      const images = pageBody.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('file://') && !src.startsWith('data:')) {
          // Point img source to absolute local path
          img.src = `file://${resourceDir}/${src}`;
        }
      });

      // Inject the cleaned body into the template's content root
      const contentRoot = document.getElementById('content-root');
      contentRoot.innerHTML = '';
      
      // Move children from pageBody to contentRoot
      while (pageBody.firstChild) {
        contentRoot.appendChild(pageBody.firstChild);
      }

      // Check title for document header banner
      const docTitle = tempDiv.querySelector('.page-title')?.textContent || 'Notes';
      document.getElementById('banner-placeholder').textContent = docTitle.toUpperCase();

    }, rawNotionHtml, inputDir);

    // Wait for all image assets to load fully to prevent blank content in PDF columns
    console.log('Waiting for images and fonts to load...');
    await page.evaluate(async () => {
      const imageElements = Array.from(document.querySelectorAll('img'));
      await Promise.all(imageElements.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      }));

      // Wait for Google Fonts to be ready
      await document.fonts.ready;
    });

    console.log(`Generating print-ready PDF: ${outputPath}...`);
    
    // Print to PDF with headers, footers and margins matching the Design Reference
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 15px 36px 5px 36px; border-bottom: 1px solid #E2E8F0; color: #64748B; -webkit-print-color-adjust: exact;">
          <div>
            <img src="${headerLogoBase64}" style="height: 18px; width: auto; display: block; object-fit: contain;">
          </div>
          <div style="font-weight: 700; text-transform: uppercase; color: #1B71AC; letter-spacing: 0.5px;">
            Economic and Social Issues &nbsp;|&nbsp; Economic Growth and Development
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 5px 36px 15px 36px; border-top: 1px solid #E2E8F0; color: #64748B; -webkit-print-color-adjust: exact;">
          <div style="font-weight: 600;">+91 9999466225</div>
          <div style="font-weight: 700; color: #1B71AC; text-decoration: none;">www.anujjindal.in</div>
          <div style="background-color: #2AB573; color: #FFFFFF; padding: 2px 6px; font-weight: 700; font-size: 8px; border-radius: 2px;">
            <span class="pageNumber"></span>
          </div>
        </div>
      `,
      margin: {
        top: '65px',
        bottom: '50px',
        left: '36px',
        right: '36px'
      }
    });

    console.log('PDF generation completed successfully!');
  } catch (error) {
    console.error('PDF generation failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
