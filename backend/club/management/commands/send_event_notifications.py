import json
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings


def _subscription_wants_event(subscription, event) -> bool:
    """Return True if this subscription should receive a notification for event."""
    try:
        disc_ids = json.loads(subscription.discipline_ids or '[]')
        team_ids = json.loads(subscription.team_ids or '[]')
    except (json.JSONDecodeError, AttributeError):
        disc_ids, team_ids = [], []

    # No preferences set → receive everything
    if not disc_ids and not team_ids:
        return True

    # Global event (no discipline, no team) → notify everyone
    if not event.discipline_id and not event.team_id:
        return True

    # Check discipline match
    if disc_ids and event.discipline_id and event.discipline_id in disc_ids:
        return True

    # Check team match
    if team_ids and event.team_id and event.team_id in team_ids:
        return True

    return False


class Command(BaseCommand):
    help = "Send push notifications for upcoming calendar events (default: next 24 hours)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Send notifications for events starting within this many hours (default: 24).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending.",
        )

    def handle(self, *args, **options):
        from club.models import CalendarEvent, PushSubscription
        from pywebpush import webpush, WebPushException

        hours = options["hours"]
        dry_run = options["dry_run"]

        now = timezone.now()
        cutoff = now + datetime.timedelta(hours=hours)

        events = CalendarEvent.objects.filter(
            start_datetime__gte=now,
            start_datetime__lte=cutoff,
            is_cancelled=False,
        ).select_related("event_type", "team", "discipline")

        if not events.exists():
            self.stdout.write("No upcoming events found.")
            return

        subscriptions = list(PushSubscription.objects.all())
        if not subscriptions:
            self.stdout.write("No push subscriptions registered.")
            return

        if not settings.VAPID_PRIVATE_KEY:
            self.stderr.write(
                "VAPID_PRIVATE_KEY is not set — cannot send push notifications."
            )
            return

        sent = 0
        failed = 0
        stale = 0

        for event in events:
            # Only notify subscribers who care about this event
            interested = [s for s in subscriptions if _subscription_wants_event(s, event)]

            details = []
            if event.team:
                details.append(event.team.name)
            if event.location:
                details.append(event.location)

            payload = {
                "title": event.title,
                "body": (
                    event.start_datetime.strftime("%d.%m %H:%M")
                    + (f" · {', '.join(details)}" if details else "")
                ),
                "url": "/",
            }

            self.stdout.write(
                f"{'[DRY RUN] ' if dry_run else ''}Event: {event.title} "
                f"@ {event.start_datetime.strftime('%d.%m.%Y %H:%M')} "
                f"→ {len(interested)}/{len(subscriptions)} subscriber(s)"
            )


            if dry_run:
                continue

            for sub in list(interested):
                try:
                    webpush(
                        subscription_info={
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                        },
                        data=json.dumps(payload),
                        vapid_private_key=settings.VAPID_PRIVATE_KEY,
                        vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"},
                    )
                    sent += 1
                except Exception as exc:
                    response = getattr(exc, "response", None)
                    if response is not None and getattr(response, "status_code", None) == 410:
                        sub.delete()
                        subscriptions.remove(sub)
                        stale += 1
                    else:
                        failed += 1
                        self.stderr.write(f"  Failed for {sub.endpoint[:60]}…: {exc}")

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Done — sent: {sent}, failed: {failed}, stale removed: {stale}"
                )
            )
