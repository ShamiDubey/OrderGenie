from typing import List, Dict, Any, Optional
import numpy as np
from deepface import DeepFace
from PIL import Image
import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class DeepFaceService:
    def __init__(self):
        self.model_name = settings.MODEL_NAME
        self.detector_backend = settings.DETECTOR_BACKEND
        self.distance_metric = "cosine"
        self._initialized = False

    def initialize(self):
        """Pre-load models to avoid cold start latency"""
        if self._initialized:
            return

        logger.info(f"Loading DeepFace model: {self.model_name}")
        try:
            # Create a dummy image for warmup
            dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
            DeepFace.represent(
                img_path=dummy_img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
            )
            self._initialized = True
            logger.info("Model warmup complete")
        except Exception as e:
            logger.warning(f"Warmup failed (may work on actual images): {e}")
            self._initialized = True

    def detect_faces(self, image_bytes: bytes) -> Dict[str, Any]:
        """Detect faces in an image and return bounding boxes"""
        try:
            img_array = self._bytes_to_numpy(image_bytes)

            faces = DeepFace.extract_faces(
                img_path=img_array,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True,
            )

            results = []
            for face in faces:
                facial_area = face.get("facial_area", {})
                results.append(
                    {
                        "facial_area": {
                            "x": int(facial_area.get("x", 0)),
                            "y": int(facial_area.get("y", 0)),
                            "w": int(facial_area.get("w", 0)),
                            "h": int(facial_area.get("h", 0)),
                        },
                        "confidence": float(face.get("confidence", 0)),
                    }
                )

            return {
                "success": True,
                "faces_count": len(results),
                "faces": results,
            }
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return {
                "success": False,
                "error": str(e),
                "faces_count": 0,
                "faces": [],
            }

    def get_embeddings(self, image_bytes: bytes) -> Dict[str, Any]:
        """Generate face embeddings for recognition"""
        try:
            img_array = self._bytes_to_numpy(image_bytes)

            embeddings = DeepFace.represent(
                img_path=img_array,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True,
            )

            results = []
            for emb in embeddings:
                facial_area = emb.get("facial_area", {})
                results.append(
                    {
                        "embedding": emb["embedding"],
                        "facial_area": {
                            "x": int(facial_area.get("x", 0)),
                            "y": int(facial_area.get("y", 0)),
                            "w": int(facial_area.get("w", 0)),
                            "h": int(facial_area.get("h", 0)),
                        },
                        "confidence": float(emb.get("face_confidence", 0)),
                    }
                )

            return {
                "success": True,
                "model": self.model_name,
                "embedding_size": len(results[0]["embedding"]) if results else 0,
                "embeddings": results,
            }
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "embeddings": [],
            }

    def analyze_face(
        self, image_bytes: bytes, actions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Analyze facial attributes (age, gender, emotion, race)"""
        if actions is None:
            actions = ["age", "gender", "emotion", "race"]

        try:
            img_array = self._bytes_to_numpy(image_bytes)

            results = DeepFace.analyze(
                img_path=img_array,
                actions=actions,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                silent=True,
            )

            # Results is a list if multiple faces
            if isinstance(results, list):
                return {
                    "success": True,
                    "faces_analyzed": len(results),
                    "results": results,
                }
            else:
                return {
                    "success": True,
                    "faces_analyzed": 1,
                    "results": [results],
                }
        except Exception as e:
            logger.error(f"Face analysis error: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
            }

    def verify_faces(
        self, image1_bytes: bytes, image2_bytes: bytes
    ) -> Dict[str, Any]:
        """Verify if two images contain the same person"""
        try:
            img1_array = self._bytes_to_numpy(image1_bytes)
            img2_array = self._bytes_to_numpy(image2_bytes)

            result = DeepFace.verify(
                img1_path=img1_array,
                img2_path=img2_array,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                distance_metric=self.distance_metric,
                enforce_detection=False,
                align=True,
            )

            return {
                "success": True,
                "verified": result["verified"],
                "distance": float(result["distance"]),
                "threshold": float(result["threshold"]),
                "model": result["model"],
                "similarity_metric": result["similarity_metric"],
            }
        except Exception as e:
            logger.error(f"Face verification error: {e}")
            return {
                "success": False,
                "error": str(e),
                "verified": False,
            }

    def _bytes_to_numpy(self, image_bytes: bytes) -> np.ndarray:
        """Convert image bytes to numpy array"""
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        return np.array(image)


# Singleton instance
deepface_service = DeepFaceService()
