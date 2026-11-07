(() => {
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const browseButton = document.getElementById("browseButton");
  const fileDetails = document.getElementById("fileDetails");
  const fileName = document.getElementById("fileName");
  const fileMeta = document.getElementById("fileMeta");
  const outputFormat = document.getElementById("outputFormat");
  const qualityControl = document.getElementById("qualityControl");
  const quality = document.getElementById("quality");
  const qualityValue = document.getElementById("qualityValue");
  const selectedFileCount = document.getElementById("selectedFileCount");
  const convertButton = document.getElementById("convertButton");
  const statusMessage = document.getElementById("statusMessage");
  const outputDetails = document.getElementById("outputDetails");
  const outputName = document.getElementById("outputName");
  const outputMeta = document.getElementById("outputMeta");
  const downloadLink = document.getElementById("downloadLink");
  const removeFileButton = document.getElementById("removeFileButton");

  const imageTypes = {
    png: { label: "PNG", mime: "image/png" },
    jpg: { label: "JPEG", mime: "image/jpeg" },
    webp: { label: "WebP", mime: "image/webp" }
  };
  const documentTypes = {
    txt: { label: "Plain text (.txt)", mime: "text/plain;charset=utf-8" },
    md: { label: "Markdown (.md)", mime: "text/markdown;charset=utf-8" },
    html: { label: "HTML (.html)", mime: "text/html;charset=utf-8" }
  };
  let selectedFile = null;
  let selectedKind = null;
  let outputUrl = null;

  function setStatus(message, state = "") {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
  }

  function getExtension(name) {
    const match = name.toLowerCase().match(/\.([^.]+)$/);
    if (!match) return "";
    if (match[1] === "jpeg") return "jpg";
    if (match[1] === "markdown") return "md";
    if (match[1] === "htm") return "html";
    return match[1];
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let size = bytes / 1024;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
  }

  function clearOutput() {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    downloadLink.removeAttribute("href");
    outputDetails.classList.add("hidden");
  }

  function optionsFor(kind, sourceExtension) {
    const options = kind === "image" ? imageTypes : documentTypes;
    outputFormat.replaceChildren();
    Object.entries(options).forEach(([extension, details]) => {
      if (extension === sourceExtension) return;
      const option = document.createElement("option");
      option.value = extension;
      option.textContent = details.label;
      outputFormat.append(option);
    });
    const pdfOption = document.createElement("option");
    pdfOption.value = "pdf";
    pdfOption.textContent = "PDF (.pdf)";
    outputFormat.append(pdfOption);
    outputFormat.disabled = false;
    updateQualityControl();
  }

  function updateQualityControl() {
    const lossyImage = selectedKind === "image" && ["jpg", "webp"].includes(outputFormat.value);
    qualityControl.classList.toggle("hidden", !lossyImage);
  }

  function reset() {
    selectedFile = null;
    selectedKind = null;
    fileInput.value = "";
    fileDetails.classList.add("hidden");
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a file first";
    placeholder.disabled = true;
    placeholder.selected = true;
    outputFormat.replaceChildren(placeholder);
    outputFormat.disabled = true;
    convertButton.disabled = true;
    selectedFileCount.textContent = "No file added";
    qualityControl.classList.add("hidden");
    clearOutput();
    setStatus("");
  }

  function acceptFile(file) {
    if (!file) return;
    const extension = getExtension(file.name);
    const kind = Object.hasOwn(imageTypes, extension) ? "image" :
      Object.hasOwn(documentTypes, extension) ? "document" : null;
    if (!kind) {
      reset();
      setStatus("Choose a PNG, JPEG, WebP, TXT, Markdown, or HTML file.", "error");
      return;
    }

    selectedFile = file;
    selectedKind = kind;
    fileName.textContent = file.name;
    fileMeta.textContent = `${kind === "image" ? "Image" : "Document"} · ${formatSize(file.size)}`;
    fileDetails.classList.remove("hidden");
    convertButton.disabled = false;
    selectedFileCount.textContent = "Added 1 file";
    clearOutput();
    setStatus("");
    optionsFor(kind, extension);
  }

  function downloadBlob(blob, originalName, extension) {
    const baseName = originalName.replace(/\.[^.]+$/, "") || "converted-file";
    const name = `${baseName}.${extension}`;
    outputUrl = URL.createObjectURL(blob);
    downloadLink.href = outputUrl;
    downloadLink.download = name;
    outputName.textContent = name;
    outputMeta.textContent = formatSize(blob.size);
    outputDetails.classList.remove("hidden");
    setStatus("Conversion complete. Your file is ready to download.", "success");
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("This image could not be opened by your browser."));
      };
      image.src = url;
    });
  }

  async function convertImage(file, format) {
    const image = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create an image canvas.");

    const isJpeg = format === "jpg";
    if (isJpeg) {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);

    if (format === "pdf") {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) throw new Error("PDF support could not load. Check your connection and try again.");
      const pdfImage = canvas.toDataURL("image/jpeg", Number(quality.value) / 100);
      const width = canvas.width * 0.75;
      const height = canvas.height * 0.75;
      const doc = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "pt", format: [width, height] });
      doc.addImage(pdfImage, "JPEG", 0, 0, width, height);
      return doc.output("blob");
    }

    const details = imageTypes[format];
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error(`Your browser could not export this image as ${details.label}.`)), details.mime, Number(quality.value) / 100);
    });
    if (blob.type !== details.mime) throw new Error(`Your browser does not support ${details.label} export.`);
    return blob;
  }

  function htmlToText(html) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed.querySelectorAll("script,style,noscript,template").forEach(element => element.remove());
    parsed.body.querySelectorAll("br").forEach(element => element.replaceWith("\n"));
    parsed.body.querySelectorAll("p,div,section,article,li,h1,h2,h3,h4,h5,h6,blockquote,pre").forEach(element => {
      element.append("\n");
    });
    return parsed.body.textContent.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function markdownInline(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
    return html;
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    for (let index = 0; index < lines.length;) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        blocks.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }
      if (/^[-*+]\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
          items.push(`<li>${markdownInline(lines[index].trim().replace(/^[-*+]\s+/, ""))}</li>`);
          index += 1;
        }
        blocks.push(`<ul>\n${items.join("\n")}\n</ul>`);
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
          items.push(`<li>${markdownInline(lines[index].trim().replace(/^\d+\.\s+/, ""))}</li>`);
          index += 1;
        }
        blocks.push(`<ol>\n${items.join("\n")}\n</ol>`);
        continue;
      }
      const paragraph = [];
      while (index < lines.length && lines[index].trim()) {
        paragraph.push(markdownInline(lines[index].trim()));
        index += 1;
      }
      blocks.push(`<p>${paragraph.join(" ")}</p>`);
    }
    return blocks.join("\n");
  }

  function textToHtml(text, sourceExtension) {
    const body = sourceExtension === "md" ?
      markdownToHtml(text) :
      text.trim().split(/\n\s*\n/).filter(Boolean).map(paragraph =>
        `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`
      ).join("\n");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Converted document</title>
</head>
<body>
${body}
</body>
</html>
`;
  }

  async function textToPdf(text) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error("PDF support could not load. Check your connection and try again.");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const lineHeight = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const maxY = doc.internal.pageSize.getHeight() - margin;
    let y = margin;
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    const lines = text.split(/\r?\n/).flatMap(line => line ? doc.splitTextToSize(line, maxWidth) : [""]);
    for (const line of lines) {
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    return doc.output("blob");
  }

  async function convertDocument(file, format) {
    const sourceExtension = getExtension(file.name);
    const source = (await file.text()).replace(/^\uFEFF/, "");
    const text = sourceExtension === "html" ? htmlToText(source) : source;
    if (format === "pdf") return textToPdf(text);

    const content = format === "html" ? textToHtml(text, sourceExtension) : text;
    return new Blob([content], { type: documentTypes[format].mime });
  }

  fileInput.addEventListener("change", () => acceptFile(fileInput.files[0]));
  browseButton.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("click", event => {
    if (event.target !== browseButton) fileInput.click();
  });
  dropZone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  }));
  ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  }));
  dropZone.addEventListener("drop", event => acceptFile(event.dataTransfer.files[0]));
  removeFileButton.addEventListener("click", reset);
  outputFormat.addEventListener("change", () => {
    updateQualityControl();
    clearOutput();
    setStatus("");
  });
  quality.addEventListener("input", () => {
    qualityValue.textContent = `${quality.value}%`;
  });

  document.getElementById("converterForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!selectedFile || !outputFormat.value) return;
    convertButton.disabled = true;
    clearOutput();
    setStatus("Converting...");
    try {
      const format = outputFormat.value;
      const blob = selectedKind === "image" ?
        await convertImage(selectedFile, format) :
        await convertDocument(selectedFile, format);
      downloadBlob(blob, selectedFile.name, format);
    } catch (error) {
      console.error("File conversion failed:", error);
      setStatus(error instanceof Error ? error.message : "The file could not be converted.", "error");
    } finally {
      convertButton.disabled = false;
    }
  });

  window.addEventListener("beforeunload", clearOutput);
})();
