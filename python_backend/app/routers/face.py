from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Optional

from app.services.deepface_service import deepface_service

router = APIRouter()


@router.post("/detect")
async def detect_faces(image: UploadFile = File(...)):
    """
    Detect faces in an uploaded image.
    Returns bounding boxes and confidence scores.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await image.read()
    result = deepface_service.detect_faces(contents)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Detection failed"))

    return result


@router.post("/represent")
async def get_embeddings(image: UploadFile = File(...)):
    """
    Generate face embeddings for the uploaded image.
    Returns 512-dimensional vectors (Facenet512).
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await image.read()
    result = deepface_service.get_embeddings(contents)

    if not result["success"]:
        raise HTTPException(
            status_code=500, detail=result.get("error", "Embedding generation failed")
        )

    return result


@router.post("/analyze")
async def analyze_face(
    image: UploadFile = File(...), actions: Optional[List[str]] = None
):
    """
    Analyze facial attributes.
    Available actions: age, gender, emotion, race
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await image.read()
    result = deepface_service.analyze_face(contents, actions)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))

    return result


@router.post("/verify")
async def verify_faces(
    image1: UploadFile = File(...), image2: UploadFile = File(...)
):
    """
    Verify if two images contain the same person.
    """
    for img in [image1, image2]:
        if not img.content_type or not img.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Both files must be images")

    contents1 = await image1.read()
    contents2 = await image2.read()

    result = deepface_service.verify_faces(contents1, contents2)

    if not result["success"]:
        raise HTTPException(
            status_code=500, detail=result.get("error", "Verification failed")
        )

    return result
