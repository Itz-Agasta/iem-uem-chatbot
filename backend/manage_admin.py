"""
Manage admin accounts stored in Postgres.

Usage:
    python manage_admin.py create --username admin --password 'a-real-password'
    python manage_admin.py list
    python manage_admin.py delete --username admin
    python manage_admin.py set-password --username admin --password 'a-new-password'

Run `python manage_admin.py create` once before first use to set up the
initial admin account -- there are no default/hardcoded credentials.
"""
import argparse
import getpass
import sys

from app.auth import hash_password
from app.db import SessionLocal, init_db
from app.models import AdminUser


def cmd_create(args: argparse.Namespace) -> None:
    password = args.password or getpass.getpass("Password: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == args.username).first()
        if existing:
            print(f"Admin user '{args.username}' already exists. Use set-password to change it.", file=sys.stderr)
            sys.exit(1)

        user = AdminUser(username=args.username, hashed_password=hash_password(password))
        db.add(user)
        db.commit()
        print(f"Created admin user '{args.username}'.")
    finally:
        db.close()


def cmd_set_password(args: argparse.Namespace) -> None:
    password = args.password or getpass.getpass("New password: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == args.username).first()
        if not user:
            print(f"No admin user '{args.username}' found.", file=sys.stderr)
            sys.exit(1)
        user.hashed_password = hash_password(password)
        db.commit()
        print(f"Password updated for '{args.username}'.")
    finally:
        db.close()


def cmd_list(_args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        users = db.query(AdminUser).all()
        if not users:
            print("No admin users yet. Create one with: python manage_admin.py create --username admin")
            return
        for u in users:
            print(f"  {u.id:>3}  {u.username:<20}  created {u.created_at}")
    finally:
        db.close()


def cmd_delete(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == args.username).first()
        if not user:
            print(f"No admin user '{args.username}' found.", file=sys.stderr)
            sys.exit(1)
        db.delete(user)
        db.commit()
        print(f"Deleted admin user '{args.username}'.")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage IEM-UEM kiosk admin accounts")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_create = subparsers.add_parser("create", help="Create a new admin account")
    p_create.add_argument("--username", required=True)
    p_create.add_argument("--password", help="If omitted, you'll be prompted (safer -- avoids shell history)")
    p_create.set_defaults(func=cmd_create)

    p_setpw = subparsers.add_parser("set-password", help="Change an existing admin's password")
    p_setpw.add_argument("--username", required=True)
    p_setpw.add_argument("--password", help="If omitted, you'll be prompted")
    p_setpw.set_defaults(func=cmd_set_password)

    p_list = subparsers.add_parser("list", help="List admin accounts")
    p_list.set_defaults(func=cmd_list)

    p_delete = subparsers.add_parser("delete", help="Delete an admin account")
    p_delete.add_argument("--username", required=True)
    p_delete.set_defaults(func=cmd_delete)

    args = parser.parse_args()

    init_db()  # ensure the admin_users table exists before we touch it
    args.func(args)


if __name__ == "__main__":
    main()
