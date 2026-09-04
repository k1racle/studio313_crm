from pathlib import Path

from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import permissions
from rest_framework.views import APIView


@method_decorator(xframe_options_exempt, name='dispatch')
class HelpdeskWidgetView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        template_path = Path(__file__).with_name('helpdesk_widget.html')
        return HttpResponse(template_path.read_text(encoding='utf-8'))
