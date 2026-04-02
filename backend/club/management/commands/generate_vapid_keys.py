from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate a VAPID key pair for Web Push notifications"

    def handle(self, *args, **options):
        try:
            from py_vapid import Vapid
        except ImportError:
            self.stderr.write(self.style.ERROR(
                "pywebpush is not installed. Run: pip install pywebpush"
            ))
            return

        v = Vapid()
        v.generate_keys()

        public_key = v.public_key_urlsafe_base64
        private_key = v.private_key_urlsafe_base64

        self.stdout.write(self.style.SUCCESS("\n=== VAPID Keys Generated ===\n"))
        self.stdout.write(self.style.WARNING("Set these in your environment:\n"))

        self.stdout.write(self.style.SUCCESS("--- Vercel (frontend) ---"))
        self.stdout.write(f"VITE_VAPID_PUBLIC_KEY={public_key}\n")

        self.stdout.write(self.style.SUCCESS("--- Koyeb (backend) ---"))
        self.stdout.write(f"VAPID_PRIVATE_KEY={private_key}")
        self.stdout.write(f"VAPID_ADMIN_EMAIL=mailto:your@email.com\n")

        self.stdout.write(self.style.WARNING(
            "Keep the private key secret — never commit it to git.\n"
        ))
