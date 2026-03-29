import os
import uuid
import boto3
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class GenerateCoachPhotoUploadURL(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ext = request.data.get('ext', 'jpg')
        key = f"coaches/photos/{uuid.uuid4()}.{ext}"
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        try:
            upload_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': key,
                    'ContentType': request.data.get('contentType', 'image/jpeg'),
                },
                ExpiresIn=600,
                HttpMethod='PUT',
            )
            final_url = f"{settings.MEDIA_URL}{key}"
            return Response({'uploadUrl': upload_url, 'finalUrl': final_url})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateGeneralPhotoUploadURL(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ext = request.data.get('ext', 'jpg')
        key = f"general/photos/{uuid.uuid4()}.{ext}"
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        try:
            upload_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': key,
                    'ContentType': request.data.get('contentType', 'image/jpeg'),
                },
                ExpiresIn=600,
                HttpMethod='PUT',
            )
            final_url = f"{settings.MEDIA_URL}{key}"
            return Response({'uploadUrl': upload_url, 'finalUrl': final_url})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GeneratePlayerPhotoUploadURL(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ext = request.data.get('ext', 'jpg')
        key = f"players/photos/{uuid.uuid4()}.{ext}"
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        try:
            upload_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': key,
                    'ContentType': request.data.get('contentType', 'image/jpeg'),
                },
                ExpiresIn=600,
                HttpMethod='PUT',
            )
            final_url = f"{settings.MEDIA_URL}{key}"
            return Response({'uploadUrl': upload_url, 'finalUrl': final_url})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateTeamPhotoUploadURL(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ext = request.data.get('ext', 'jpg')
        key = f"teams/photos/{uuid.uuid4()}.{ext}"
        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        try:
            upload_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': key,
                    'ContentType': request.data.get('contentType', 'image/jpeg'),
                },
                ExpiresIn=600,
                HttpMethod='PUT',
            )
            final_url = f"{settings.MEDIA_URL}{key}"
            return Response({'uploadUrl': upload_url, 'finalUrl': final_url})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
