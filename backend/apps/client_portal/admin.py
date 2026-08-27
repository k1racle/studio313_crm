from django.contrib import admin

from .models import ClientAccessToken, MaterialApproval


admin.site.register(ClientAccessToken)
admin.site.register(MaterialApproval)
