from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import IsDealer, IsSupplier
from .serializers import (
    UserLoginSerializer,
    UserRegistrationSerializer,
    UserSafeSerializer,
)


class UserRegistrationView(APIView):
    """
    Registers a new Dealer or Supplier user.
    Accepts: username, password, email, role (DEALER or SUPPLIER).
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            refresh["role"] = user.role
            refresh["username"] = user.username

            response_data = {
                "message": "User registered successfully.",
                "user": UserSafeSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """
    Authenticates a user using username and password.
    Returns access/refresh tokens and user safe details including role.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            access_token = serializer.validated_data["access"]
            refresh_token = serializer.validated_data["refresh"]

            response_data = {
                "message": "Login successful.",
                "tokens": {
                    "access": access_token,
                    "refresh": refresh_token,
                },
                "user": UserSafeSerializer(user).data,
            }
            return Response(response_data, status=status.HTTP_200_OK)

        # Check if error is credential failure
        errors = serializer.errors
        status_code = status.HTTP_401_UNAUTHORIZED if "detail" in errors else status.HTTP_400_BAD_REQUEST
        return Response(errors, status=status_code)


class CurrentUserView(APIView):
    """
    Protected endpoint returning safe details for the currently authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSafeSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DealerTestView(APIView):
    """
    Protected test endpoint accessible ONLY to users with the DEALER role.
    """
    permission_classes = [IsAuthenticated, IsDealer]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "message": "Access granted: Dealer verified.",
                "user": UserSafeSerializer(request.user).data,
                "endpoint": "dealer_protected_test",
            },
            status=status.HTTP_200_OK,
        )


class SupplierTestView(APIView):
    """
    Protected test endpoint accessible ONLY to users with the SUPPLIER role.
    """
    permission_classes = [IsAuthenticated, IsSupplier]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "message": "Access granted: Supplier verified.",
                "user": UserSafeSerializer(request.user).data,
                "endpoint": "supplier_protected_test",
            },
            status=status.HTTP_200_OK,
        )
