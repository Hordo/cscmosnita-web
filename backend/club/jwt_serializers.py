from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace the default 'username' field with 'email'
        self.fields.pop("username", None)
        self.fields["email"] = serializers.CharField()

    def validate(self, attrs):
        User = get_user_model()
        credential = attrs.get("email", "").strip()
        password = attrs.get("password", "")

        # Primary lookup: by email (case-insensitive)
        user = User.objects.filter(email__iexact=credential).first()

        # Fallback for legacy accounts whose username != email (e.g. createsuperuser)
        if user is None:
            user = User.objects.filter(username__iexact=credential).first()

        if user is None or not user.is_active or not user.check_password(password):
            raise serializers.ValidationError(
                "No active account found with the given credentials."
            )

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        try:
            roles = list(
                user.club_roles.select_related("discipline", "team").values(
                    "role", "discipline_id", "discipline__name",
                    "discipline__discipline_type", "team_id", "team__name"
                )
            )
        except Exception:
            roles = []
        token["admin_roles"] = [
            {
                "role": r["role"],
                "discipline_id": r["discipline_id"],
                "discipline_name": r["discipline__name"],
                "discipline_type": r["discipline__discipline_type"],
                "team_id": r["team_id"],
                "team_name": r["team__name"],
            }
            for r in roles
        ]
        return token
