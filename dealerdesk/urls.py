"""
URL configuration for dealerdesk project.
"""

from django.contrib import admin
from django.urls import include, path

from accounts.views import DealerTestView, SupplierTestView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Authentication endpoints
    path("api/auth/", include("accounts.urls")),
    # Role-based verification test endpoints
    path("api/dealer/test/", DealerTestView.as_view(), name="dealer-test"),
    path("api/supplier/test/", SupplierTestView.as_view(), name="supplier-test"),
]
