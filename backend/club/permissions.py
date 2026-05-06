from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q


def get_user_admin_discipline_ids(user, min_role='coach_admin'):
    """
    Returns list of discipline IDs the user has admin write access to.
    Returns None if user is superuser (all disciplines — caller should treat None as "all").
    Returns empty list [] if user has no qualifying roles.
    min_role='head_admin' restricts to head_admin only; 'coach_admin' allows both roles.
    """
    from .models import UserRole
    if not user.is_authenticated:
        return []
    if user.is_superuser:
        return None  # All disciplines
    qs = UserRole.objects.filter(user=user)
    if min_role == 'head_admin':
        qs = qs.filter(role='head_admin')
    return list(qs.values_list('discipline_id', flat=True))


def assert_discipline_write_access(user, discipline_id, min_role='coach_admin'):
    """
    Raises PermissionDenied if user cannot write to the given discipline.
    Pass min_role='head_admin' for operations that require head admin or above.
    discipline_id may be None/falsy — in that case superuser passes, others are denied.
    """

    if not user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if user.is_superuser:
        return
    if not discipline_id:
        raise PermissionDenied("You don't have permission to perform this action.")
    allowed = get_user_admin_discipline_ids(user, min_role=min_role)
    if allowed is None or int(discipline_id) in allowed:
        return
    role_label = "head admin" if min_role == 'head_admin' else "admin"
    raise PermissionDenied(f"You need {role_label} access for this discipline.")


def get_user_admin_team_ids(user, discipline_id=None):
    """
    Returns the set of team IDs the user can write to within a discipline.
    Returns None if the user has unrestricted access (superuser, head_admin, or
    a coach_admin with no team constraint on their role).
    Returns an empty set if the user has no qualifying roles.
    """
    from .models import UserRole
    if not user.is_authenticated:
        return set()
    if user.is_superuser:
        return None  # All teams

    qs = UserRole.objects.filter(user=user)
    if discipline_id:
        qs = qs.filter(discipline_id=int(discipline_id))

    # head_admin has full discipline access (no team restriction)
    if qs.filter(role='head_admin').exists():
        return None

    coach_roles = qs.filter(role='coach_admin')

    # A coach_admin with team=None means unrestricted within the discipline
    if coach_roles.filter(team__isnull=True).exists():
        return None

    # Otherwise return the explicit team IDs assigned
    return set(coach_roles.values_list('team_id', flat=True))


def assert_team_write_access(user, team_id):
    """
    Raises PermissionDenied if the user cannot write to the given team.
    Checks discipline access first, then team-level access.
    Pass team_id=None to enforce generic admin check (no team required).
    """
    from .models import Team
    if not user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if user.is_superuser:
        return

    if not team_id:
        # No team specified: fall back to generic admin check
        from .models import UserRole
        if not UserRole.objects.filter(user=user).exists():
            raise PermissionDenied("Admin access required.")
        return

    # Resolve discipline from team
    try:
        team = Team.objects.select_related('discipline').get(pk=int(team_id))
        discipline_id = team.discipline_id
    except Team.DoesNotExist:
        raise PermissionDenied("Team not found.")

    # First check discipline-level access
    allowed_disciplines = get_user_admin_discipline_ids(user, min_role='coach_admin')
    if allowed_disciplines is not None and (
        discipline_id is None or int(discipline_id) not in allowed_disciplines
    ):
        raise PermissionDenied("You don't have admin access for this discipline.")

    # Then check team-level access
    allowed_teams = get_user_admin_team_ids(user, discipline_id=discipline_id)
    if allowed_teams is None or int(team_id) in allowed_teams:
        return

    raise PermissionDenied("You don't have access to manage this team.")


def assert_super_admin(user):
    if not user.is_authenticated or not user.is_superuser:
        raise PermissionDenied("Superuser access required.")


def is_any_admin(user):
    """Returns True if user is superuser, is_staff, or has any UserRole."""
    from .models import UserRole
    if not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    return UserRole.objects.filter(user=user).exists()


class IsAnyAdminOrReadOnly(BasePermission):
    """Allow safe methods for all; write only for authenticated admins (any role)."""
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return is_any_admin(request.user)


class IsSuperAdminOrReadOnly(BasePermission):
    """Allow safe methods for all; write only for superusers."""
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.is_authenticated and request.user.is_superuser


class IsSuperAdmin(BasePermission):
    """Only superusers allowed for any method."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser
