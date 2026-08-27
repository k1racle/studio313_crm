from rest_framework import permissions


PATH_CAPABILITIES = {
    'clients': 'clients',
    'contacts': 'clients',
    'projects': 'projects',
    'tasks': 'tasks',
    'production': 'production',
    'media-plan': 'media_plan',
    'files': 'files',
    'booking': 'bookings',
    'payments': 'finance',
    'helpdesk': 'helpdesk',
    'chat': 'chat',
    'knowledge': 'knowledge',
    'time-entries': 'timesheets',
    'client-portal': 'clients',
}


def request_capability(request):
    parts = [part for part in request.path.split('/') if part]
    resource = parts[1] if len(parts) > 1 and parts[0] == 'api' else ''
    prefix = PATH_CAPABILITIES.get(resource)
    if not prefix:
        return None
    action = 'view' if request.method in permissions.SAFE_METHODS else 'manage'
    return f'{prefix}.{action}'


class IsAdminOrDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_director or request.user.has_capability('roles.manage')
        )


class IsManagerOrHigher(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_manager:
            return True
        if request.path.startswith('/api/auth/users'):
            return request.user.has_capability('team.manage')
        capability = request_capability(request)
        return bool(capability and request.user.has_capability(capability))


class HasCapability(permissions.BasePermission):
    def has_permission(self, request, view):
        capability = getattr(view, 'required_capability', None)
        return bool(
            request.user
            and request.user.is_authenticated
            and capability
            and request.user.has_capability(capability)
        )


class RouteCapabilityPermission(permissions.BasePermission):
    """Require the capability matching an API resource and HTTP method."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        capability = request_capability(request)
        return True if capability is None else request.user.has_capability(capability)
