from rest_framework.permissions import BasePermission

from .models import Guardian, Senior


class IsSenior(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Senior)


class IsGuardian(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Guardian)
