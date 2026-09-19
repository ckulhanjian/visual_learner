import sys

from app import create_app
from app.extensions import db
from app.seed import run_seed


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "serve"
    app = create_app()

    if command == "serve":
        with app.app_context():
            db.create_all()
        app.run(port=5001, debug=app.config.get("DEBUG", False))
    elif command == "seed":
        with app.app_context():
            db.create_all()
            run_seed()
    elif command == "reset":
        with app.app_context():
            db.drop_all()
            db.create_all()
            run_seed()
    elif command == "routes":
        with app.app_context():
            for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
                methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
                print(f"{methods:20s} {rule.rule}")
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
