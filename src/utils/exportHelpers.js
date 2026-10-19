export function downloadCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPDF(title, targetElement) {
  let contentHtml = '';
  if (typeof targetElement === 'string') {
    const el = document.querySelector(targetElement);
    contentHtml = el ? el.outerHTML : '';
  } else if (targetElement && targetElement.outerHTML) {
    contentHtml = targetElement.outerHTML;
  }

  if (!contentHtml) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - VEMUBA ENTERPRISES</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1b241a; }
          h2 { color: #1f4d1f; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #e8f2e3; color: #1f4d1f; padding: 8px; text-align: left; border: 1px solid #d9e3d3; }
          td { padding: 7px 8px; border: 1px solid #eef1ea; }
          .pos { color: #1b7a3d; font-weight: bold; }
          .neg { color: #b3261e; font-weight: bold; }
          .text-right { text-align: right; }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div>${contentHtml}</div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 350);
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
