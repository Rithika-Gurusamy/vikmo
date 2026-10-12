from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SupplierProfile, User


class UserSafeSerializer(serializers.ModelSerializer):
    """
    Serializer providing safe user information without exposing password hashes.
    """
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "date_joined")
        read_only_fields = ("id", "username", "email", "role", "date_joined")


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Validates and registers new DealerDesk users with DEALER or SUPPLIER role.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"}
    )
    email = serializers.EmailField(
        required=True,
        allow_blank=False
    )
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        required=True
    )

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "role")
        read_only_fields = ("id",)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_role(self, value):
        if value not in (User.Role.DEALER, User.Role.SUPPLIER):
            raise serializers.ValidationError("Role must be either DEALER or SUPPLIER.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.get("role")

        # Create user with properly hashed password
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=password,
            role=role,
            is_staff=False,
            is_superuser=False,
        )

        # Create corresponding profile if supplier
        if role == User.Role.SUPPLIER:
            SupplierProfile.objects.create(
                user=user,
                company_name="",
                supplier_code=f"SUP-{user.id:04d}"
            )

        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Authenticates user using credentials (username and password only).
    Does NOT require or accept role from client request.
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"}
    )

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError(
                {"detail": "Invalid username or password."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account is inactive. Please contact distributor support."}
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Custom claims on token
        refresh["role"] = user.role
        refresh["username"] = user.username

        return {
            "user": user,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
