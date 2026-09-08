"""HTTP(S) URL validation shared by local inference adapters."""

from urllib.parse import urlsplit, urlunsplit


def normalize_http_base_url(value: str, label: str = "endpoint") -> str:
    """Return a normalized credential-free HTTP(S) base URL.

    This validates URL syntax only. It does not assert that an endpoint is
    local, trusted, or reachable.
    """

    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty HTTP(S) URL")

    candidate = value.strip()
    if any(ord(character) < 32 or ord(character) == 127 for character in candidate):
        raise ValueError(f"{label} must not contain control characters")

    try:
        parsed = urlsplit(candidate)
        parsed.port
    except ValueError as error:
        raise ValueError(f"{label} must be a valid absolute HTTP(S) URL") from error

    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError(f"{label} must use http or https")
    if not parsed.hostname:
        raise ValueError(f"{label} must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError(f"{label} must not embed credentials")
    if parsed.query or parsed.fragment:
        raise ValueError(f"{label} must not include a query string or fragment")

    normalized_path = parsed.path.rstrip("/")
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), normalized_path, "", ""))
