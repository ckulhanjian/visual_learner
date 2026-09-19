import re

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    value = _NON_ALNUM.sub("-", value.strip().lower()).strip("-")
    return value or "item"


def make_unique_slug(base_value: str, exists_fn) -> str:
    base = slugify(base_value)
    candidate = base
    n = 2
    while exists_fn(candidate):
        candidate = f"{base}-{n}"
        n += 1
    return candidate
