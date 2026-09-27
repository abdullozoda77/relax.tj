from rest_framework import permissions

def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin"))

def is_moderator(user):
    """Moderators check suggestions and reviews; admins can do that too."""
    return bool(user and user.is_authenticated and (is_admin(user) or user.role == "moderator"))

class IsAdmin(permissions.BasePermission):
    message = "Only admins can do this."

    def has_permission(self, request, view):
        return is_admin(request.user)

class IsAdminOrReadOnly(permissions.BasePermission):
    message = "Only admins can change this."

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or is_admin(request.user)

class IsModerator(permissions.BasePermission):
    message = "Only moderators and admins can do this."

    def has_permission(self, request, view):
        return is_moderator(request.user)

class IsOwnerOrModeratorDeleteOrReadOnly(permissions.BasePermission):
    """Reviews: the author can edit and delete; moderators and admins can only delete (moderation)."""
    message = "You can only change your own reviews."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or obj.user == request.user:
            return True
        return request.method == "DELETE" and is_moderator(request.user)

class IsOwner(permissions.BasePermission):
    message = "This does not belong to you."

    def has_object_permission(self, request, view, obj):
        owner = obj.travel_list.user if hasattr(obj, "travel_list") else obj.user
        return owner == request.user