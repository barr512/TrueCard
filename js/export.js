document.addEventListener("DOMContentLoaded", () => {
  const exportButton =
    document.getElementById("exportExistingBackupButton");
  const status =
    document.getElementById("existingBackupStatus");

  if (!exportButton) return;

  exportButton.addEventListener("click", async () => {
    exportButton.disabled = true;

    if (status) {
      status.hidden = false;
      status.textContent = "Preparing collection backup…";
    }

    try {
      const snapshot = await createBackupSnapshot();
      const blob = new Blob(
        [JSON.stringify(snapshot)],
        { type: "application/json" }
      );
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = downloadUrl;
      link.download = `TrueCard-backup-${date}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      if (status) {
        status.textContent =
          `Backup created with ${snapshot.data.cards.length} cards.`;
      }
    } catch (error) {
      console.error("Collection export failed:", error);

      if (status) {
        status.textContent =
          `Export failed: ${error.message}`;
      }
    } finally {
      exportButton.disabled = false;
    }
  });
});
