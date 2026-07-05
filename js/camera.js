/******************************************************************************
 * TrueCard
 * camera.js
 *
 * Complete replacement
 ******************************************************************************/

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

/******************************************************************************
 * EVENTS
 ******************************************************************************/

scanFrontButton.addEventListener("click", () => openCamera("front"));
scanBackButton.addEventListener("click", () => openCamera("back"));

captureButton.addEventListener("click", captureImage);

closeCameraButton.addEventListener("click", closeCamera);

/******************************************************************************
 * CAMERA
 ******************************************************************************/

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

    }

    catch (error) {

        alert(
            "Unable to access the camera."
        );

        console.error(error);

        closeCamera();

    }

}

/******************************************************************************
 * CAPTURE
 ******************************************************************************/

function captureImage() {

    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    canvas.width = cameraVideo.videoWidth;

    canvas.height = cameraVideo.videoHeight;

    context.drawImage(

        cameraVideo,

        0,

        0,

        canvas.width,

        canvas.height

    );

    canvas.toBlob(blob => {

        const imageURL = URL.createObjectURL(blob);

        if (currentScanSide === "front") {

            frontImageData = imageURL;

            frontPreview.src = imageURL;

            frontPreview.hidden = false;

            document.dispatchEvent(

                new CustomEvent(

                    "frontImageCaptured",

                    {

                        detail: {

                            blob,

                            imageURL

                        }

                    }

                )

            );

        }

        if (currentScanSide === "back") {

            backImageData = imageURL;

            backPreview.src = imageURL;

            backPreview.hidden = false;

            document.dispatchEvent(

                new CustomEvent(

                    "backImageCaptured",

                    {

                        detail: {

                            blob,

                            imageURL

                        }

                    }

                )

            );

        }

        closeCamera();

    }, "image/jpeg", 0.90);

}

/******************************************************************************
 * CLOSE
 ******************************************************************************/

function closeCamera() {

    cameraModal.classList.remove("open");

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => track.stop());

    }

    cameraStream = null;

    cameraVideo.srcObject = null;

}

/******************************************************************************
 * ACCESSORS
 ******************************************************************************/

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
