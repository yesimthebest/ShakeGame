import { RefObject, useEffect, useState } from "react";
import {
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

const LEFT_WRIST_INDEX = 15;
const RIGHT_WRIST_INDEX = 16;
const MIN_VISIBILITY = 0.5;

type WristName = "leftWrist" | "rightWrist";

export type WristDot = {
  name: WristName;
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
};

type LandmarkWithPresence = NormalizedLandmark & {
  presence?: number;
};

function hasEnoughConfidence(landmark: LandmarkWithPresence | undefined) {
  if (!landmark) {
    return false;
  }

  return (landmark.visibility ?? landmark.presence ?? 0) >= MIN_VISIBILITY;
}

function getVideoContentRect(video: HTMLVideoElement) {
  const width = video.clientWidth;
  const height = video.clientHeight;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!width || !height || !videoWidth || !videoHeight) {
    return null;
  }

  const elementRatio = width / height;
  const videoRatio = videoWidth / videoHeight;

  if (elementRatio > videoRatio) {
    const renderedWidth = height * videoRatio;

    return {
      width: renderedWidth,
      height,
      offsetX: (width - renderedWidth) / 2,
      offsetY: 0,
    };
  }

  const renderedHeight = width / videoRatio;

  return {
    width,
    height: renderedHeight,
    offsetX: 0,
    offsetY: (height - renderedHeight) / 2,
  };
}

function toDot(
  name: WristName,
  landmark: LandmarkWithPresence | undefined,
  video: HTMLVideoElement,
) {
  const contentRect = getVideoContentRect(video);

  if (!contentRect || !landmark || !hasEnoughConfidence(landmark)) {
    return null;
  }

  return {
    name,
    x: contentRect.offsetX + landmark.x * contentRect.width,
    y: contentRect.offsetY + landmark.y * contentRect.height,
    normalizedX: landmark.x,
    normalizedY: landmark.y,
  };
}

export function usePoseLandmarker(
  videoRef: RefObject<HTMLVideoElement | null>,
  isEnabled: boolean,
) {
  const [wristDots, setWristDots] = useState<WristDot[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isEnabled) {
      setWristDots([]);
      return;
    }

    let animationFrameId = 0;
    let isCancelled = false;
    let poseLandmarker: PoseLandmarker | null = null;

    async function startDetection() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );

        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        detectPose();
      } catch {
        if (!isCancelled) {
          setErrorMessage("포즈 감지를 시작할 수 없습니다.");
        }
      }
    }

    function detectPose() {
      const video = videoRef.current;

      if (
        poseLandmarker &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        const result = poseLandmarker.detectForVideo(video, performance.now());
        const landmarks = result.landmarks[0] as
          | LandmarkWithPresence[]
          | undefined;

        const nextDots = [
          toDot("leftWrist", landmarks?.[LEFT_WRIST_INDEX], video),
          toDot("rightWrist", landmarks?.[RIGHT_WRIST_INDEX], video),
        ].filter((dot): dot is WristDot => dot !== null);

        setWristDots(nextDots);
      }

      if (!isCancelled) {
        animationFrameId = requestAnimationFrame(detectPose);
      }
    }

    startDetection();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      poseLandmarker?.close();
    };
  }, [isEnabled, videoRef]);

  return { wristDots, errorMessage };
}
