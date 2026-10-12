from django.views.generic import TemplateView


class DealerPortalView(TemplateView):
    """
    Serves the modern, responsive DealerDesk Dealer Portal UI.
    """
    template_name = "dealer/index.html"
