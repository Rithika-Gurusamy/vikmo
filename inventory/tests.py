from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse

from inventory.models import Dealer

User = get_user_model()


class DealerModelAndPortalTests(TestCase):
    """
    Tests for Dealer profile model relationships, role enforcement,
    and Dealer Portal UI views.
    """

    def setUp(self):
        self.dealer_user = User.objects.create_user(
            username="dealer_user_1",
            email="dealer1@example.com",
            password="SecurePass123!",
            role=User.Role.DEALER,
        )
        self.supplier_user = User.objects.create_user(
            username="supplier_user_1",
            email="supplier1@example.com",
            password="SecurePass123!",
            role=User.Role.SUPPLIER,
        )

    def test_create_valid_dealer_profile(self):
        dealer = Dealer.objects.create(
            user=self.dealer_user,
            dealer_code="DLR-KA-0099",
            business_name="Karnataka Spares Hub",
            contact_person="Sunil Gowda",
            email="sunil@karnatakaspares.in",
            phone="9876543211",
            city="Bengaluru",
            state="Karnataka",
            address="Peenya Industrial Area",
            pincode="560058",
            credit_limit=Decimal("500000.00"),
        )
        dealer.full_clean()  # should not raise
        self.assertEqual(dealer.user, self.dealer_user)
        self.assertEqual(self.dealer_user.dealer_profile, dealer)

    def test_reject_supplier_user_on_dealer_profile(self):
        dealer = Dealer(
            user=self.supplier_user,
            dealer_code="DLR-KA-9999",
            business_name="Invalid Supplier Dealer",
            email="invalid@example.com",
            phone="9876543210",
            city="Bengaluru",
            state="Karnataka",
        )
        with self.assertRaises(ValidationError):
            dealer.full_clean()

    def test_dealer_one_to_one_constraint(self):
        Dealer.objects.create(
            user=self.dealer_user,
            dealer_code="DLR-KA-0001",
            business_name="First Dealership",
            email="first@example.com",
            phone="9876543210",
            city="Bengaluru",
            state="Karnataka",
        )
        with self.assertRaises(IntegrityError):
            Dealer.objects.create(
                user=self.dealer_user,
                dealer_code="DLR-KA-0002",
                business_name="Second Duplicate Dealership",
                email="second@example.com",
                phone="9876543210",
                city="Bengaluru",
                state="Karnataka",
            )

    def test_dealer_portal_views_render_successfully(self):
        # Test root endpoint
        response_root = self.client.get(reverse("dealer-portal"))
        self.assertEqual(response_root.status_code, 200)
        self.assertTemplateUsed(response_root, "dealer/index.html")
        self.assertContains(response_root, "DealerDesk")
        self.assertContains(response_root, "Automotive Spare Parts Catalogue")

        # Test alias endpoint
        response_alias = self.client.get(reverse("dealer-portal-alias"))
        self.assertEqual(response_alias.status_code, 200)
        self.assertTemplateUsed(response_alias, "dealer/index.html")
