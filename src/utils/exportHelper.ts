/**
 * Triggers a browser file download for CSV/JSON/TXT report data.
 */
export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((field) => {
          const str = String(field ?? "").replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        })
        .join(",")
    ),
  ].join("\n");

  downloadFile(filename, csvContent, "text/csv;charset=utf-8;");
}
