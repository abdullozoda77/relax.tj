from rest_framework import permissions

def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin"))

class IsAdmin(permissions.BasePermission):
    message = "Only admins can do this."

    def has_permission(self, request, view):
        return is_admin(request.user)

class IsAdminOrReadOnly(permissions.BasePermission):
    message = "Only admins can change this."

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or is_admin(request.user)

class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    message = "You can only change your own items."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user or is_admin(request.user)

class IsOwner(permissions.BasePermission):
    message = "This does not belong to you."

    def has_object_permission(self, request, view, obj):
        owner = obj.travel_list.user if hasattr(obj, "travel_list") else obj.user
        return owner == request.user