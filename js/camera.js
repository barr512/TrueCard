const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const captureButton = document.getElementById("captureButton");
const closeCameraButton = document.getElementById("closeCameraButton");
const scanFrontButton = document.getElementById("scanFrontButton");
const scanBackButton = document.getElementById("scanBackButton");
const frontPreview = document.getElementById("frontPreview");
const backPreview = document.getElementById("backPreview");

let cameraStream = null;
let currentScanSide = null;
let frontImageData = "";
let backImageData = "";

scanFrontButton.addEventListener("click", () => openCamera("front"));
scanBackButton.addEventListener("click", () => openCamera("back"));
captureButton.addEventListener("click", captureImage);
closeCameraButton.addEventListener("click", closeCamera);

async function openCamera(side) {
  currentScanSide = side;
  cameraModal.classList.add("open");

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
  } catch (error) {
    alert("Camera could not be opened. Make sure the browser has camera permission.");
    console.error(error);
    closeCamera();
  }
}

function captureImage() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;

  context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL("image/jpeg", 0.82);

  if (currentScanSide === "front") {
    frontImageData = imageData;
    frontPreview.src = imageData;
    frontPreview.hidden = false;
  }

  if (currentScanSide === "back") {
    backImageData = imageData;
    backPreview.src = imageData;
    backPreview.hidden = false;
  }

  closeCamera();
}

function closeCamera() {
  cameraModal.classList.remove("open");

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  cameraStream = null;
  cameraVideo.srcObject = null;
}

function getScannedImages() {
  return {
    frontImage: frontImageData,
    backImage: backImageData
  };
}

function clearScannedImages() {
  frontImageData = "";
  backImageData = "";

  frontPreview.src = "";
  backPreview.src = "";

  frontPreview.hidden = true;
  backPreview.hidden = true;
}
