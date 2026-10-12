from django.contrib import admin
from .models import Dealer, Inventory, Order, OrderItem, Product


class InventoryInline(admin.StackedInline):
    model = Inventory
    can_delete = False
    verbose_name = "Warehouse Stock"
    verbose_name_plural = "Warehouse Stock"
    fields = ("quantity", "reserved_quantity", "reorder_threshold", "last_restocked_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "name",
        "category",
        "price",
        "supplier_sku",
        "supplier_id",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "category")
    search_fields = ("sku", "name", "supplier_sku", "supplier_id")
    readonly_fields = ("created_at", "updated_at")
    inlines = [InventoryInline]


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "quantity",
        "reserved_quantity",
        "available_for_order",
        "reorder_threshold",
        "last_restocked_at",
        "updated_at",
    )
    search_fields = ("product__sku", "product__name")
    list_filter = ("reorder_threshold",)
    readonly_fields = ("updated_at",)


@admin.register(Dealer)
class DealerAdmin(admin.ModelAdmin):
    list_display = (
        "dealer_code",
        "user",
        "business_name",
        "contact_person",
        "city",
        "state",
        "phone",
        "gstin",
        "credit_limit",
        "is_active",
    )
    list_filter = ("is_active", "state")
    search_fields = (
        "dealer_code",
        "user__username",
        "business_name",
        "contact_person",
        "email",
        "phone",
        "gstin",
    )
    readonly_fields = ("created_at", "updated_at")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = (
        "product",
        "quantity",
        "unit_price",
        "gst_rate",
        "gst_amount",
        "line_total",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "dealer",
        "status",
        "subtotal",
        "gst_amount",
        "total_amount",
        "created_at",
        "confirmed_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "order_number",
        "dealer__business_name",
        "dealer__dealer_code",
        "idempotency_key",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "confirmed_at",
        "dispatched_at",
        "delivered_at",
        "cancelled_at",
    )
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product",
        "quantity",
        "unit_price",
        "gst_rate",
        "gst_amount",
        "line_total",
    )
    search_fields = ("order__order_number", "product__sku", "product__name")
    list_filter = ("gst_rate",)
    readonly_fields = ("created_at", "updated_at")
