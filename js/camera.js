function captureImage() {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;

    context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.90);

    canvas.toBlob(blob => {
        if (currentScanSide === "front") {
            frontImageData = imageData;
            frontPreview.src = imageData;
            frontPreview.hidden = false;

            document.dispatchEvent(new CustomEvent("frontImageCaptured", {
                detail: { blob, imageData }
            }));
        }

        if (currentScanSide === "back") {
            backImageData = imageData;
            backPreview.src = imageData;
            backPreview.hidden = false;

            document.dispatchEvent(new CustomEvent("backImageCaptured", {
                detail: { blob, imageData }
            }));
        }

        closeCamera();
    }, "image/jpeg", 0.90);
}
