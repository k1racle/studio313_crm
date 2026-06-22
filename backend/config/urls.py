from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/booking/', include('apps.booking.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/helpdesk/', include('apps.helpdesk.urls')),
    path('api/telegram/', include('apps.telegram_bot.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/client-portal/', include('apps.client_portal.urls')),
    path('api/tags/', include('apps.tags.urls')),
    path('api/time-entries/', include('apps.timesheets.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
