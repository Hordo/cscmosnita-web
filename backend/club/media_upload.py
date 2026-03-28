import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings

def handle_media_upload(file, folder="uploads"):
    """
    Handles file upload to the configured storage (Cloudflare R2 via django-storages).
    Returns the file URL after upload.
    """
    ext = file.name.split('.')[-1]
    filename = f"{folder}/{uuid.uuid4()}.{ext}"
    saved_path = default_storage.save(filename, ContentFile(file.read()))
    file_url = default_storage.url(saved_path)
    return file_url
